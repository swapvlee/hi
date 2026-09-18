import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

// 自定义锁函数，防止跨标签页锁竞争导致页面卡死
const lock = async <R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
  if (typeof navigator === "undefined" || !navigator.locks) {
    return fn();
  }
  try {
    return await navigator.locks.request(
      name,
      { mode: "exclusive", signal: AbortSignal.timeout(acquireTimeout) },
      async () => fn()
    );
  } catch {
    return fn();
  }
};

// 数据服务（PostgREST）在重建 schema 缓存、或多个实例之间缓存尚未同步时，
// 会短暂返回 PGRST002 / PGRST116。这类请求会被后端直接拒绝、并未真正执行，
// 因此在此处做透明重试是安全的：用户无需再手动点“重试”。
const TRANSIENT_ERROR_CODES = ["PGRST002", "PGRST116"];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry: typeof fetch = async (input, init) => {
  // 数据服务重建 schema 缓存时，瞬时窗口约 1 秒，但偶尔会连续重建（“风暴”），
  // 单靠 3 秒的短重试扛不住。这里用指数退避 + 更长的总窗口（约 15 秒），
  // 尽量在后台吞掉这类瞬时失败；只有确认是瞬时错误码才重试，真实故障照常返回。
  const maxAttempts = 6;
  const baseDelay = 500;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(input, init);
    } catch (err) {
      // 网络抖动：请求未真正送达，可安全重试
      if (attempt >= maxAttempts - 1 || (init?.signal?.aborted ?? false)) throw err;
      await sleep(baseDelay * 2 ** attempt);
      continue;
    }

    if (response.status < 500) return response;

    // 只有确认是「瞬时」错误码才重试；其它 5xx 原样返回，避免吞掉真实故障
    let code = "";
    try {
      const parsed = await response.clone().json();
      code = typeof parsed?.code === "string" ? parsed.code : "";
    } catch {
      code = "";
    }

    if (!TRANSIENT_ERROR_CODES.includes(code) || attempt >= maxAttempts - 1) {
      return response;
    }

    await sleep(baseDelay * 2 ** attempt);
  }

  return fetch(input, init);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock,
  },
  global: {
    fetch: fetchWithRetry,
  },
});