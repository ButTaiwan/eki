import { STYLE_ROSTER as RENDERER_STYLE_ROSTER } from "./renderers.js";

export const STYLE_ROSTER = RENDERER_STYLE_ROSTER;

export const FIELD_IDS = [
  "cname", "ename", "jname", "kname",
  "no", "rgb", "kana", "area",
  "s_cname", "s_ename",
  "p_cname", "p_ename", "p_jname", "p_kana", "p_kname", "p_no", "p_dis",
  "n_cname", "n_ename", "n_jname", "n_kana", "n_kname", "n_no", "n_dis"
];

export const FONT_MAPPING = {
  "Font_Helvetica": "Inter_24pt-Medium.ttf",
  "Font_HelveticaBold": "Inter_24pt-Bold.ttf",
  "Font_FrutigerMedium": "Hind-Medium.ttf",
  "Font_FrutigerBold": "Hind-Bold.ttf",
  "Font_FuturaBold": "LeagueSpartan-Bold.ttf",
  "Font_Optima": "Marcellus-Regular.ttf",
  "Font_CondensedDigit": "AntonSC-Regular.ttf",

  "Font_GothicJP_M": "GenYoGothic2JP-M.otf",
  "Font_GothicJP_B": "GenYoGothic2JP-B.otf",
  "Font_OldGothicJP_R": "GenSekiGothic2PJP-M.otf",
  "Font_OldMaruGothicJP_M": "rounded-mgenplus-1cp-medium.ttf",
  "Font_NewMaruGothicJP_M": "GenSenRounded2JP-M.otf",
  "Font_GothicTW_R": "GenYoGothic2TW-R.otf",
  "Font_GothicTW_M": "GenYoGothic2TW-M.otf",
  "Font_MinchoTW_M": "GenRyuMin2TW-SB.otf",
  "Font_MinchoHK_SB": "GenYoMin2TC-SB.otf",
  "Font_GothicKR_M": "SourceHanSansKR-Medium.otf",
  "Font_GothicCN_R": "FangZhengHeiTi_GBK.ttf",

  "Font_JNR_Kana": "JNRfont.ttf",
  "Font_JNR_Kanji": "JNRfont_n.ttf",
  "Font_Fude_Eki": "Fudeekimeihyo1.2.ttf",
  "Font_Fude_Kanji": "fude-goshirae.otf",
  "Font_Jihacheol": "NewJihacheol-che.ttf",
  "Font_SeoulNamsan": "08SeoulNamsanEB.ttf",
  "Font_OldBlack": "Staatliches-Regular.ttf",
  "Font_Johnston": "HammersmithOne-Regular.ttf",
  "Font_LTAIdentity": "LTAIdentity-Medium.woff2",
  "Font_KORAIL": "KORAIL.ttf"
};

const STYLE_TYPE_SUFFIX_RE = /^(.*?)(?:__t(\d+))?$/;

export function parseStyleValue(styleValue) {
  const raw = String(styleValue || "");
  const m = raw.match(STYLE_TYPE_SUFFIX_RE);
  const styleId = (m?.[1] || raw) || "";
  const type = Math.max(1, Math.floor(Number(m?.[2]) || 1));
  return { styleId, type };
}

export function toStyleValue(styleId, type = 1) {
  const safeType = Math.max(1, Math.floor(Number(type) || 1));
  return safeType === 1 ? String(styleId || "") : `${String(styleId || "")}__t${safeType}`;
}

export function getStyleMetadata(styleId) {
  const { styleId: baseStyleId } = parseStyleValue(styleId);
  return STYLE_ROSTER.find((s) => s.id === baseStyleId) || STYLE_ROSTER[0];
}

export function getFieldsForStyle(styleId) {
  return getStyleMetadata(styleId).fields;
}

export function getFontsForStyle(styleId) {
  return getStyleMetadata(styleId).fonts;
}
