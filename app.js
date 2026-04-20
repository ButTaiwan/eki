import { ensureFonts } from "./fonts.js";
import { RENDERERS } from "./renderers.js";
import { FIELD_IDS, STYLE_ROSTER, getFieldsForStyle, getFontsForStyle } from "./styles-config.js";

// 所有系統資料從單一 JSON 載入
let ALL_STATIONS_DATA = null; // { [sysName]: { routes, stations } }

const $ = (id) => document.getElementById(id);
const ui = {
  sys: $("sys"), route: $("route"), station: $("station"),
  type: $("type"),
  useStation: $("use-station"), render: $("render"), download: $("download"),
  convertT2S: $("convert-t2s"), convertS2T: $("convert-s2t"),
  clearFields: $("clear-fields"),
  sizeButtons: Array.from(document.querySelectorAll(".size-btn")),
  preview: $("preview"), status: $("status")
};
const isJaUi = document.documentElement.lang?.toLowerCase().startsWith("ja");

let currentData = null;
let currentRouteEntries = [];
let currentStationLookup = {};
let downloadSize = 3;
const fieldInputs = Object.fromEntries(FIELD_IDS.map((id) => [id, $(id)]));
const STORAGE_CONTENT_KEY = "eki.content.v1";
const STORAGE_SIZE_KEY = "eki.downloadSize.v1";

function saveContentState() {
  try {
    const payload = {};
    for (const fieldId of FIELD_IDS) {
      const input = fieldInputs[fieldId];
      if (!input) continue;
      payload[fieldId] = input.value ?? "";
    }
    localStorage.setItem(STORAGE_CONTENT_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
}

function loadContentState() {
  try {
    const raw = localStorage.getItem(STORAGE_CONTENT_KEY);
    if (!raw) return;
    const payload = JSON.parse(raw);
    if (!payload || typeof payload !== "object") return;

    for (const fieldId of FIELD_IDS) {
      const input = fieldInputs[fieldId];
      if (!input) continue;
      const val = payload[fieldId];
      if (typeof val !== "string") continue;
      input.value = fieldId === "rgb" ? normalizeColorValue(val) : val;
    }

    saveContentState();
  } catch {
    // ignore storage errors
  }
}

function saveDownloadSizeState() {
  try {
    localStorage.setItem(STORAGE_SIZE_KEY, String(downloadSize));
  } catch {
    // ignore storage errors
  }
}

function loadDownloadSizeState() {
  try {
    const raw = localStorage.getItem(STORAGE_SIZE_KEY);
    const v = Number(raw);
    if (v === 1 || v === 2 || v === 3) return v;
  } catch {
    // ignore storage errors
  }
  return 3;
}

function updatePreviewCssSize() {
  if (!ui.preview.width) return;
  const scale = downloadSize / 3;
  ui.preview.style.width = Math.round(ui.preview.width * scale) + "px";
  ui.preview.style.height = Math.round(ui.preview.height * scale) + "px";
}

function setActiveSize(size) {
  downloadSize = size;
  for (const btn of ui.sizeButtons) {
    btn.classList.toggle("active", Number(btn.dataset.size) === size);
  }
  updatePreviewCssSize();
  saveDownloadSizeState();
}

function applyFieldHighlight(styleId) {
  const active = new Set(getFieldsForStyle(styleId));
  const wrappers = document.querySelectorAll(".field-wrapper");
  for (const el of wrappers) {
    const fieldId = el.dataset.fieldId;
    const input = fieldInputs[fieldId];
    const isActive = active.has(fieldId);
    el.classList.toggle("field-active", isActive);
    el.classList.toggle("field-inactive", !isActive);
    if (input) input.disabled = !isActive;
  }
}

function setStatus(msg) {
  ui.status.textContent = msg;
}

function normalizeColorValue(value, fallback = "#c80000") {
  const hex = String(value || "").replace(/[^0-9a-f]/gi, "").slice(0, 6);
  if (hex.length === 6) return `#${hex}`;
  return fallback;
}

const T2S_CHAR_PAIRS = [
  ["萬", "万"], ["與", "与"], ["為", "为"], ["雲", "云"], ["廣", "广"], ["華", "华"], ["門", "门"],
  ["東", "东"], ["龍", "龙"], ["龜", "龟"], ["鹽", "盐"], ["鳳", "凤"], ["頭", "头"], ["烏", "乌"],
  ["豐", "丰"], ["岡", "冈"], ["蘆", "芦"], ["車", "车"], ["鐵", "铁"], ["運", "运"], ["機", "机"],
  ["場", "场"], ["圖", "图"], ["書", "书"], ["館", "馆"], ["國", "国"], ["際", "际"], ["醫", "医"],
  ["藝", "艺"], ["術", "术"], ["區", "区"], ["線", "线"], ["號", "号"], ["發", "发"], ["灣", "湾"],
  ["後", "后"], ["莊", "庄"], ["橋", "桥"], ["壢", "坜"], ["內", "内"], ["園", "园"], ["驛", "驿"],
  ["關", "关"], ["學", "学"], ["樂", "乐"], ["陽", "阳"], ["陰", "阴"], ["權", "权"], ["體", "体"],
  ["點", "点"], ["變", "变"], ["傳", "传"], ["務", "务"], ["會", "会"], ["電", "电"], ["網", "网"],
  ["專", "专"], ["業", "业"], ["實", "实"], ["愛", "爱"], ["價", "价"], ["幣", "币"], ["應", "应"],
  ["當", "当"], ["開", "开"], ["閉", "闭"], ["陸", "陆"], ["續", "续"], ["進", "进"], ["這", "这"],
  ["還", "还"], ["裡", "里"], ["嗎", "吗"], ["嗎", "吗"], ["嗎", "吗"], ["請", "请"], ["讓", "让"],
  ["觀", "观"], ["覽", "览"], ["顯", "显"], ["示", "示"], ["鐘", "钟"], ["錶", "表"], ["錢", "钱"],
  ["銀", "银"], ["銅", "铜"], ["鋼", "钢"], ["錄", "录"], ["寫", "写"], ["讀", "读"], ["說", "说"],
  ["話", "话"], ["語", "语"], ["豬", "猪"], ["貓", "猫"], ["鳥", "鸟"], ["魚", "鱼"], ["馬", "马"],
  ["風", "风"], ["氣", "气"], ["廣", "广"], ["廠", "厂"], ["廳", "厅"], ["庫", "库"], ["廟", "庙"],
  ["劃", "划"], ["劑", "剂"], ["劍", "剑"], ["劇", "剧"], ["勞", "劳"], ["勢", "势"], ["務", "务"],
  ["動", "动"], ["辦", "办"], ["協", "协"], ["單", "单"], ["嚴", "严"], ["圍", "围"], ["圖", "图"],
  ["壓", "压"], ["壞", "坏"], ["壯", "壮"], ["壽", "寿"], ["夾", "夹"], ["奧", "奥"], ["奪", "夺"],
  ["婦", "妇"], ["媽", "妈"], ["姊", "姐"], ["姦", "奸"], ["孫", "孙"], ["學", "学"], ["寶", "宝"],
  ["將", "将"], ["專", "专"], ["導", "导"], ["屆", "届"], ["層", "层"], ["屬", "属"], ["岡", "冈"],
  ["島", "岛"], ["峽", "峡"], ["崗", "岗"], ["嶺", "岭"], ["幫", "帮"], ["幾", "几"], ["廢", "废"],
  ["廣", "广"], ["廬", "庐"], ["彈", "弹"], ["強", "强"], ["彙", "汇"], ["彥", "彦"], ["後", "后"],
  ["徑", "径"], ["從", "从"], ["復", "复"], ["憂", "忧"], ["憑", "凭"], ["懷", "怀"], ["懸", "悬"],
  ["戰", "战"], ["戲", "戏"], ["戶", "户"], ["拋", "抛"], ["拔", "拔"], ["擁", "拥"], ["擇", "择"],
  ["擔", "担"], ["據", "据"], ["擬", "拟"], ["擴", "扩"], ["攝", "摄"], ["攔", "拦"], ["敗", "败"],
  ["敗", "败"], ["數", "数"], ["斂", "敛"], ["斷", "断"], ["無", "无"], ["時", "时"], ["曆", "历"],
  ["曉", "晓"], ["暈", "晕"], ["暢", "畅"], ["曬", "晒"], ["書", "书"], ["會", "会"], ["朧", "胧"],
  ["殺", "杀"], ["條", "条"], ["極", "极"], ["構", "构"], ["樣", "样"], ["樹", "树"], ["橋", "桥"],
  ["檢", "检"], ["櫃", "柜"], ["歡", "欢"], ["歲", "岁"], ["歷", "历"], ["歸", "归"], ["殘", "残"],
  ["殼", "壳"], ["氣", "气"], ["漢", "汉"], ["潔", "洁"], ["測", "测"], ["濃", "浓"], ["灣", "湾"],
  ["濕", "湿"], ["瀏", "浏"], ["瀾", "澜"], ["災", "灾"], ["燈", "灯"], ["爐", "炉"], ["爭", "争"],
  ["獲", "获"], ["瑪", "玛"], ["環", "环"], ["畫", "画"], ["當", "当"], ["療", "疗"], ["癢", "痒"],
  ["盜", "盗"], ["盞", "盏"], ["監", "监"], ["盤", "盘"], ["盧", "卢"], ["礦", "矿"], ["禮", "礼"],
  ["禱", "祷"], ["禪", "禅"], ["離", "离"], ["稅", "税"], ["穩", "稳"], ["窩", "窝"], ["築", "筑"],
  ["簽", "签"], ["簡", "简"], ["糧", "粮"], ["糾", "纠"], ["紀", "纪"], ["紅", "红"], ["約", "约"],
  ["級", "级"], ["納", "纳"], ["紐", "纽"], ["純", "纯"], ["紗", "纱"], ["紙", "纸"], ["紛", "纷"],
  ["終", "终"], ["組", "组"], ["經", "经"], ["綁", "绑"], ["綠", "绿"], ["綜", "综"], ["維", "维"],
  ["網", "网"], ["總", "总"], ["織", "织"], ["繩", "绳"], ["續", "续"], ["罷", "罢"], ["罰", "罚"],
  ["羅", "罗"], ["聖", "圣"], ["聞", "闻"], ["聰", "聪"], ["聯", "联"], ["聲", "声"], ["聽", "听"],
  ["腦", "脑"], ["臉", "脸"], ["臟", "脏"], ["舉", "举"], ["興", "兴"], ["艦", "舰"], ["艙", "舱"],
  ["藝", "艺"], ["藥", "药"], ["蘋", "苹"], ["虧", "亏"], ["號", "号"], ["蟲", "虫"], ["衛", "卫"],
  ["裝", "装"], ["補", "补"], ["製", "制"], ["複", "复"], ["覺", "觉"], ["觀", "观"], ["覽", "览"],
  ["觸", "触"], ["計", "计"], ["訊", "讯"], ["記", "记"], ["訓", "训"], ["託", "托"], ["許", "许"],
  ["設", "设"], ["訪", "访"], ["證", "证"], ["評", "评"], ["詩", "诗"], ["試", "试"], ["該", "该"],
  ["誠", "诚"], ["誤", "误"], ["說", "说"], ["誰", "谁"], ["課", "课"], ["調", "调"], ["談", "谈"],
  ["請", "请"], ["諾", "诺"], ["謀", "谋"], ["謊", "谎"], ["謝", "谢"], ["謠", "谣"], ["謹", "谨"],
  ["譜", "谱"], ["警", "警"], ["貝", "贝"], ["負", "负"], ["財", "财"], ["貢", "贡"], ["貧", "贫"],
  ["貨", "货"], ["販", "贩"], ["貪", "贪"], ["貫", "贯"], ["責", "责"], ["貯", "贮"], ["貴", "贵"],
  ["貸", "贷"], ["費", "费"], ["賀", "贺"], ["資", "资"], ["賊", "贼"], ["賓", "宾"], ["賴", "赖"],
  ["賺", "赚"], ["賽", "赛"], ["贏", "赢"], ["趕", "赶"], ["趙", "赵"], ["蹤", "踪"], ["軌", "轨"],
  ["軍", "军"], ["軟", "软"], ["輪", "轮"], ["輸", "输"], ["輯", "辑"], ["辦", "办"], ["辯", "辩"],
  ["農", "农"], ["邊", "边"], ["遙", "遥"], ["遞", "递"], ["遺", "遗"], ["遷", "迁"], ["選", "选"],
  ["郵", "邮"], ["鄉", "乡"], ["醜", "丑"], ["醫", "医"], ["釋", "释"], ["針", "针"], ["鈔", "钞"],
  ["鉤", "钩"], ["銀", "银"], ["銅", "铜"], ["銘", "铭"], ["銷", "销"], ["鋁", "铝"], ["鋒", "锋"],
  ["鋪", "铺"], ["錄", "录"], ["錘", "锤"], ["錦", "锦"], ["鍋", "锅"], ["鍵", "键"], ["鐘", "钟"],
  ["鎖", "锁"], ["鏡", "镜"], ["鑑", "鉴"], ["長", "长"], ["閃", "闪"], ["閉", "闭"], ["開", "开"],
  ["閒", "闲"], ["間", "间"], ["隊", "队"], ["階", "阶"], ["際", "际"], ["隨", "随"], ["難", "难"],
  ["雙", "双"], ["雜", "杂"], ["雞", "鸡"], ["離", "离"], ["電", "电"], ["雲", "云"], ["靈", "灵"],
  ["靜", "静"], ["響", "响"], ["頁", "页"], ["頂", "顶"], ["頃", "顷"], ["項", "项"], ["順", "顺"],
  ["須", "须"], ["預", "预"], ["頑", "顽"], ["頒", "颁"], ["領", "领"], ["頭", "头"], ["頸", "颈"],
  ["題", "题"], ["額", "额"], ["顏", "颜"], ["風", "风"], ["飛", "飞"], ["飯", "饭"], ["飲", "饮"],
  ["館", "馆"], ["駐", "驻"], ["騎", "骑"], ["騰", "腾"], ["驅", "驱"], ["驗", "验"], ["髒", "脏"],
  ["魚", "鱼"], ["鳥", "鸟"], ["鳴", "鸣"], ["麥", "麦"], ["黃", "黄"], ["點", "点"]
];

const T2S_CHAR_MAP = Object.fromEntries(T2S_CHAR_PAIRS);
const S2T_CHAR_MAP = Object.fromEntries(T2S_CHAR_PAIRS.map(([traditional, simplified]) => [simplified, traditional]));
const CN_TARGET_FIELDS = ["cname", "p_cname", "n_cname", "area", "s_cname"];

function convertTextVariant(text, direction) {
  const src = String(text || "");
  if (!src) return "";
  const map = direction === "t2s" ? T2S_CHAR_MAP : S2T_CHAR_MAP;
  return [...src].map((ch) => map[ch] || ch).join("");
}

function convertChineseNameFields(direction) {
  for (const fieldId of CN_TARGET_FIELDS) {
    const input = fieldInputs[fieldId];
    if (!input) continue;
    input.value = convertTextVariant(input.value, direction);
  }
  saveContentState();
  render();
  // setStatus(direction === "t2s" ? "已轉為簡體" : "已轉為繁體");
}

function clearContentFields() {
  const defaults = {
    cname: "站名牌產生器",
    ename: "Ekimehyo Generator",
    jname: "駅名標ジェネレータ",
    kname: "역명판 제너레이터",
    kana: "えきめいひょうじぇねれえた",
    rgb: "#008000"
  };

  for (const fieldId of FIELD_IDS) {
    const input = fieldInputs[fieldId];
    if (!input) continue;
    input.value = defaults[fieldId] ?? "";
  }

  saveContentState();
  render();
  //setStatus("已清空欄位");
}

async function loadAllStationsData() {
  if (ALL_STATIONS_DATA) return ALL_STATIONS_DATA;
  const res = await fetch("./assets/data/stations.json");
  if (!res.ok) throw new Error(`無法載入資料：stations.json`);
  ALL_STATIONS_DATA = await res.json();
  return ALL_STATIONS_DATA;
}

function fillSelect(select, items) {
  select.innerHTML = "";
  for (const it of items) {
    const opt = document.createElement("option");
    opt.value = it.value;
    opt.textContent = it.label;
    select.appendChild(opt);
  }
}

function getLocalizedName(item, fallback = "") {
  if (!item || typeof item !== "object") return fallback;
  if (isJaUi) return item.jname || item.cname || item.ename || fallback;
  return item.cname || item.jname || item.ename || fallback;
}

function getSystemEntries(data) {
  if (Array.isArray(data)) {
    return data.map((sys, i) => ({
      value: String(i),
      label: getLocalizedName(sys, `System ${i + 1}`),
      data: sys
    }));
  }
  if (data && typeof data === "object") {
    return Object.entries(data).map(([key, sys]) => ({
      value: key,
      label: getLocalizedName(sys, key),
      data: sys
    }));
  }
  return [];
}

function getRouteEntries(systemData) {
  const routes = systemData?.routes;
  if (Array.isArray(routes)) {
    return routes.map((route, i) => ({
      value: String(i),
      label: getLocalizedName(route, `Route ${i + 1}`),
      list: Array.isArray(route?.list) ? route.list : []
    }));
  }
  if (routes && typeof routes === "object") {
    return Object.entries(routes).map(([key, route]) => {
      if (Array.isArray(route)) {
        return { value: key, label: key, list: route };
      }
      return {
        value: key,
        label: getLocalizedName(route, key),
        list: Array.isArray(route?.list) ? route.list : []
      };
    });
  }
  return [];
}

function getStationMap(systemData) {
  const stations = systemData?.stations;
  if (stations && typeof stations === "object" && !Array.isArray(stations)) {
    return stations;
  }
  if (Array.isArray(stations)) {
    return Object.fromEntries(stations.map((st, i) => {
      const id = st?.id || st?.sid || st?.code || st?.station_id || `station-${i + 1}`;
      return [String(id), st];
    }));
  }
  return {};
}

function stationOptions(systemData, routeEntry) {
  const stationMap = getStationMap(systemData);
  const ids = Array.isArray(routeEntry?.list) ? routeEntry.list : [];
  const lookup = {};
  const items = ids.map((ref, i) => {
    const id = typeof ref === "string"
      ? ref
      : (ref?.id || ref?.sid || ref?.code || ref?.station_id || `station-${i + 1}`);

    const station = typeof ref === "object"
      ? (stationMap[id] || ref)
      : stationMap[id];

    const value = String(id);
    lookup[value] = station;
    return {
      value,
      label: getLocalizedName(station, value)
    };
  });

  return { items, lookup };
}

function applyStationToForm(st) {
  if (!st || !currentData) return;
  for (const fieldId of FIELD_IDS) {
    const input = fieldInputs[fieldId];
    if (!input) continue;
    let val = "";
    
    // 處理前一站的資訊（需要查詢其他站點的資料）
    if (fieldId === "p_cname" && st.p_id) {
      const prevStation = currentData.stations[st.p_id];
      val = prevStation ? prevStation.cname : "";
    } else if (fieldId === "p_ename" && st.p_id) {
      const prevStation = currentData.stations[st.p_id];
      val = prevStation ? prevStation.ename : "";
    } else if (fieldId === "p_jname" && st.p_id) {
      const prevStation = currentData.stations[st.p_id];
      val = prevStation ? (prevStation.jname || "") : "";
    } else if (fieldId === "p_kana" && st.p_id) {
      const prevStation = currentData.stations[st.p_id];
      val = prevStation ? (prevStation.kana || "") : "";
    } else if (fieldId === "p_kname" && st.p_id) {
      const prevStation = currentData.stations[st.p_id];
      val = prevStation ? prevStation.kname : "";
    } else if (fieldId === "p_no" && st.p_id) {
      const prevStation = currentData.stations[st.p_id];
      val = prevStation ? (prevStation.no || "") : "";
    }
    // 處理後一站的資訊（需要查詢其他站點的資料）
    else if (fieldId === "n_cname" && st.n_id) {
      const nextStation = currentData.stations[st.n_id];
      val = nextStation ? nextStation.cname : "";
    } else if (fieldId === "n_ename" && st.n_id) {
      const nextStation = currentData.stations[st.n_id];
      val = nextStation ? nextStation.ename : "";
    } else if (fieldId === "n_jname" && st.n_id) {
      const nextStation = currentData.stations[st.n_id];
      val = nextStation ? (nextStation.jname || "") : "";
    } else if (fieldId === "n_kana" && st.n_id) {
      const nextStation = currentData.stations[st.n_id];
      val = nextStation ? (nextStation.kana || "") : "";
    } else if (fieldId === "n_kname" && st.n_id) {
      const nextStation = currentData.stations[st.n_id];
      val = nextStation ? nextStation.kname : "";
    }
    // 處理後站站號
    else if (fieldId === "n_no" && st.n_id) {
      const nextStation = currentData.stations[st.n_id];
      val = nextStation ? nextStation.no : "";
    }
    // 直接從資料取得的欄位
    else if (fieldId === "rgb") {
      val = normalizeColorValue(st[fieldId]);
    }
    else if (fieldId === "jname") {
      val = st.jname || "";
    }
    else if (fieldId === "kana") {
      val = st.kana || "";
    }
    else {
      const rawVal = st[fieldId];
      if (rawVal === false || rawVal === null || rawVal === undefined) {
        val = "";
      } else if (typeof rawVal === "string" || typeof rawVal === "number") {
        val = String(rawVal);
      }
    }
    
    input.value = val;
  }

  saveContentState();
}

function readInput() {
  const out = {};
  for (const fieldId of FIELD_IDS) {
    out[fieldId] = fieldInputs[fieldId]?.value?.trim?.() ?? "";
  }
  return out;
}

async function render() {
  const type = ui.type.value;
  const renderer = RENDERERS[type];
  if (!renderer) {
    setStatus(`尚未實作樣式：${type}`);
    return;
  }

  await ensureFonts(getFontsForStyle(type));

  const out = renderer(readInput());
  ui.preview.width = out.width;
  ui.preview.height = out.height;
  const ctx = ui.preview.getContext("2d");
  ctx.clearRect(0, 0, out.width, out.height);
  ctx.drawImage(out, 0, 0);
  updatePreviewCssSize();
  setStatus(`完成：${type} ∙ ${out.width}×${out.height}px`);
  //setStatus(`完成：${type} ∙ 原始 ${out.width}×${out.height}px ∙ 下載尺寸：${downloadSize === 3 ? "大（原尺寸）" : downloadSize === 2 ? "中（×⅔）" : "小（×⅓）"}`);
}

function exportCanvasForSize(size) {
  if (size === 3) return ui.preview;
  const factor = size / 3;
  const temp = document.createElement("canvas");
  temp.width = Math.max(1, Math.round(ui.preview.width * factor));
  temp.height = Math.max(1, Math.round(ui.preview.height * factor));
  const tctx = temp.getContext("2d");
  tctx.imageSmoothingEnabled = true;
  tctx.imageSmoothingQuality = "high";
  tctx.drawImage(ui.preview, 0, 0, temp.width, temp.height);
  return temp;
}

async function init() {
  fillSelect(ui.type, STYLE_ROSTER.map((s) => {
    const name = isJaUi ? (s.label_ja || s.label_zh || s.id) : (s.label_zh || s.label_ja || s.id);
    //return { value: s.id, label: `${name}（${s.id}）` };
    return { value: s.id, label: `${name}` };
  }));
  loadContentState();
  applyFieldHighlight(ui.type.value);

  try {
    setStatus("Now Loading...");
    await loadAllStationsData();
    const sysEntries = getSystemEntries(ALL_STATIONS_DATA);
    fillSelect(ui.sys, sysEntries.map(({ value, label }) => ({ value, label })));
    setStatus("");
  } catch (e) {
    setStatus(String(e.message || e));
  }

  function onSysChanged() {
    const sysEntries = getSystemEntries(ALL_STATIONS_DATA);
    const selected = sysEntries.find((entry) => entry.value === ui.sys.value) || sysEntries[0] || null;
    currentData = selected?.data ?? null;

    currentRouteEntries = getRouteEntries(currentData);
    fillSelect(ui.route, currentRouteEntries.map(({ value, label }) => ({ value, label })));
    onRouteChanged();
  }

  function onRouteChanged() {
    if (!currentData) return;
    const routeEntry = currentRouteEntries.find((entry) => entry.value === ui.route.value) || currentRouteEntries[0] || null;
    const { items, lookup } = stationOptions(currentData, routeEntry);
    currentStationLookup = lookup;
    fillSelect(ui.station, items);
  }

  ui.sys.addEventListener("change", onSysChanged);
  ui.route.addEventListener("change", onRouteChanged);

  for (const fieldId of FIELD_IDS) {
    const input = fieldInputs[fieldId];
    if (!input) continue;
    input.addEventListener("input", saveContentState);
    input.addEventListener("change", saveContentState);
  }

  ui.type.addEventListener("change", async () => {
    applyFieldHighlight(ui.type.value);
    await render();
  });

  for (const btn of ui.sizeButtons) {
    btn.addEventListener("click", () => {
      setActiveSize(Number(btn.dataset.size));
      //setStatus(`已切換下載尺寸：${btn.innerHTML}`);
    });
  }

  ui.useStation.addEventListener("click", () => {
    const st = currentStationLookup[ui.station.value] || currentData?.stations?.[ui.station.value];
    applyStationToForm(st);
    render();
  });

  if (ui.convertT2S) {
    ui.convertT2S.addEventListener("click", () => convertChineseNameFields("t2s"));
  }
  if (ui.convertS2T) {
    ui.convertS2T.addEventListener("click", () => convertChineseNameFields("s2t"));
  }
  if (ui.clearFields) {
    ui.clearFields.addEventListener("click", clearContentFields);
  }

  const swapBtn = $("swap-prev-next");
  if (swapBtn) {
    swapBtn.addEventListener("click", () => {
      const SWAP_PAIRS = [
        ["p_cname", "n_cname"],
        ["p_ename", "n_ename"],
        ["p_jname", "n_jname"],
        ["p_kana",  "n_kana"],
        ["p_kname", "n_kname"],
        ["p_dis",   "n_dis"],
      ];
      for (const [pId, nId] of SWAP_PAIRS) {
        const pInput = fieldInputs[pId];
        const nInput = fieldInputs[nId];
        if (!pInput || !nInput) continue;
        const tmp = pInput.value;
        pInput.value = nInput.value;
        nInput.value = tmp;
      }
      saveContentState();
      render();
      //setStatus("已對調前一站與後一站（忽略後一站車站編號）");
    });
  }

  ui.render.addEventListener("click", render);
  ui.download.addEventListener("click", async () => {
    await render();
    const out = exportCanvasForSize(downloadSize);
    out.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const sz = downloadSize === 3 ? "large" : downloadSize === 2 ? "medium" : "small";
      a.download = `eki-${ui.type.value}-${sz}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    }, "image/png");
  });

  await onSysChanged();
  setActiveSize(loadDownloadSizeState());
  await render();
}

init();
