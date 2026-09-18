export type RelationEntity = "todo" | "goal" | "habit" | "event";
export type FieldType = "text" | "textarea" | "number" | "date" | "select" | "boolean" | "formula" | "relation";

export interface CustomRelationValue {
  id: string;
  label: string;
  entity: RelationEntity;
}

export type CustomValue = string | number | boolean | CustomRelationValue;

export interface CustomField {
  id: string;
  label: string;
  type: FieldType;
  options: string[];
  required?: boolean;
  unit?: string;
  defaultValue?: CustomValue;
  min?: number;
  max?: number;
  reminder_time?: string | null;
  repeat_type?: "none" | "daily" | "weekly" | "monthly";
  repeat_days?: number[];
  formula?: {
    operation: "sum" | "average" | "count" | "min" | "max";
    sourceFieldId: string;
  };
  relation?: RelationEntity;
  archived?: boolean;
}

export interface CustomModule {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  fields: CustomField[];
  created_at: string;
}

export interface CustomEntry {
  id: string;
  module_id: string;
  data: Record<string, CustomValue>;
  created_at: string;
}

export const moduleColorMap: Record<string, { bg: string; text: string }> = {
  primary: { bg: "bg-primary-100", text: "text-primary-600" },
  accent: { bg: "bg-accent-100", text: "text-accent-600" },
  secondary: { bg: "bg-secondary-100", text: "text-secondary-700" },
};

export const fieldTypeLabels: Record<FieldType, string> = {
  text: "文本",
  textarea: "长文本",
  number: "数字",
  date: "日期",
  select: "选项",
  boolean: "开关",
  formula: "统计公式",
  relation: "关联记录",
};

export const relationLabels: Record<RelationEntity, string> = {
  todo: "待办任务",
  goal: "目标",
  habit: "习惯",
  event: "日程",
};

export interface AppTemplate {
  name: string;
  icon: string;
  color: string;
  description: string;
  fields: CustomField[];
}

export const appTemplates: AppTemplate[] = [
  {
    name: "饮水记录",
    icon: "ri-cup-line",
    color: "primary",
    description: "记录每天的饮水量，养成补水习惯",
    fields: [
      { id: crypto.randomUUID(), label: "饮水量", type: "number", options: [], required: true, unit: "杯" },
      { id: crypto.randomUUID(), label: "记录时间", type: "date", options: [], required: true },
    ],
  },
  {
    name: "阅读清单",
    icon: "ri-book-open-line",
    color: "secondary",
    description: "追踪正在阅读的书籍和阅读进度",
    fields: [
      { id: crypto.randomUUID(), label: "书名", type: "text", options: [], required: true },
      { id: crypto.randomUUID(), label: "阅读页数", type: "number", options: [], unit: "页" },
      { id: crypto.randomUUID(), label: "阅读日期", type: "date", options: [], required: true },
      { id: crypto.randomUUID(), label: "读后感", type: "textarea", options: [] },
    ],
  },
  {
    name: "运动记录",
    icon: "ri-run-line",
    color: "accent",
    description: "记录运动项目、时长和完成状态",
    fields: [
      { id: crypto.randomUUID(), label: "运动项目", type: "select", options: ["跑步", "力量训练", "瑜伽", "骑行"], required: true },
      { id: crypto.randomUUID(), label: "时长", type: "number", options: [], unit: "分钟" },
      { id: crypto.randomUUID(), label: "完成日期", type: "date", options: [], required: true },
    ],
  },
  {
    name: "个人记账",
    icon: "ri-money-dollar-circle-line",
    color: "primary",
    description: "记录日常收入和支出，掌握消费趋势",
    fields: [
      { id: crypto.randomUUID(), label: "金额", type: "number", options: [], required: true, unit: "元" },
      { id: crypto.randomUUID(), label: "类型", type: "select", options: ["支出", "收入"], required: true },
      { id: crypto.randomUUID(), label: "分类", type: "select", options: ["餐饮", "交通", "购物", "学习", "其他"] },
      { id: crypto.randomUUID(), label: "日期", type: "date", options: [], required: true },
      { id: crypto.randomUUID(), label: "备注", type: "textarea", options: [] },
    ],
  },
  {
    name: "情绪日志",
    icon: "ri-mental-health-line",
    color: "accent",
    description: "记录每天的心情和触发因素",
    fields: [
      { id: crypto.randomUUID(), label: "心情", type: "select", options: ["开心", "平静", "焦虑", "疲惫", "低落"], required: true },
      { id: crypto.randomUUID(), label: "日期", type: "date", options: [], required: true },
      { id: crypto.randomUUID(), label: "今天发生了什么", type: "textarea", options: [] },
    ],
  },
];

export const moodEmojiMap: Record<string, string> = {
  "开心": "😊",
  "平静": "😌",
  "焦虑": "😰",
  "疲惫": "😴",
  "低落": "😢",
  "愉悦": "😄",
  "难过": "😞",
  "生气": "😠",
  "惊讶": "😲",
  "害怕": "😨",
};

export const isMoodField = (label: string): boolean => {
  const lower = label.toLowerCase();
  return lower === "心情" || lower === "mood" || lower === "情绪" || lower === "feeling";
};

export const moduleIcons = [
  "ri-water-flash-line",
  "ri-cup-line",
  "ri-restaurant-line",
  "ri-book-open-line",
  "ri-money-dollar-circle-line",
  "ri-walk-line",
  "ri-run-line",
  "ri-heart-pulse-line",
  "ri-weight-line",
  "ri-mental-health-line",
  "ri-medicine-bottle-line",
  "ri-computer-line",
  "ri-gamepad-line",
  "ri-music-2-line",
  "ri-movie-line",
  "ri-camera-line",
  "ri-brush-line",
  "ri-plant-line",
  "ri-sun-line",
  "ri-moon-line",
  "ri-fire-line",
  "ri-star-line",
  "ri-flag-line",
  "ri-trophy-line",
  "ri-medal-line",
  "ri-gift-line",
  "ri-shopping-bag-line",
  "ri-car-line",
  "ri-plane-line",
  "ri-earth-line",
];