const MASTER_SCALE = 3;

function getMeasureCtx() {
  return document.createElement("canvas").getContext("2d");
}

function initCanvas(canvas, width, height, bgColor) {
  canvas.width = Math.round(width * MASTER_SCALE);
  canvas.height = Math.round(height * MASTER_SCALE);
  const ctx = canvas.getContext("2d");
  ctx.scale(MASTER_SCALE, MASTER_SCALE);
  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  }
  return ctx;
}

function hexToRgb(hex) {
  const raw = (hex || "").replace(/[^0-9a-f]/gi, "").padStart(6, "0").slice(0, 6);
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16)
  };
}

function fgOnBg({ r, g, b }) {
  return Math.max(r, g, b) < 0xe1 ? "#fff" : "#000";
}

function calWidth(min, padding, widths, step = 20) {
  const max = Math.max(...widths) + padding * 2;
  const width = Math.min(3000, Math.ceil(max / step) * step);
  return Math.max(min, width);
}

function normalizeFontFamily(family) {
  if (Array.isArray(family)) {
    const stack = family.filter(Boolean).map((name) => `"${String(name)}"`).join(", ");
    return stack || "sans-serif";
  }
  if (family) return `"${String(family)}"`;
  return "sans-serif";
}

function setFont(ctx, size, family, weight = "400") {
  const stack = normalizeFontFamily(family);
  ctx.font = `${weight} ${size}pt ${stack}, sans-serif`;
}

function textWidth(ctx, size, family, text, weight = "400") {
  setFont(ctx, size, family, weight);
  return Math.round(ctx.measureText(text || "").width);
}

function drawText(ctx, { size, family, text, x, y, align = "left", color = "#000", weight = "400", maxWidth = null, measuredWidth = null }) {
  setFont(ctx, size, family, weight);
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillStyle = color;
  //ctx.fillText(text || "", x, y);

  if (maxWidth && measuredWidth && measuredWidth > maxWidth) {
    // 將字體橫向縮小以適應圓形（高度維持不變）
    const scale = maxWidth / measuredWidth;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, 1);
    ctx.fillText(text || "", 0, 0);
    //drawText(ctx, { size: 48, family: "Font_Jihacheol", text: input.kname, x: 0, y: 0, align: "center", color: "#000" });
    ctx.restore();
  } else {
    ctx.fillText(text || "", x, y);
  }
}

function drawFilledCircle(ctx, centerX, centerY, radius, color) {
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawFilledRect(ctx, x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
}

function drawFilledPolygon(ctx, points, color) {
  if (!points?.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawRoundRect(ctx, x, y, width, height, radius, color) {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function splitStationNo(no = "") {
  const s = String(no).trim();
  const m = s.match(/^([A-Za-z]*)(\d+\D*)$/);
  if (m) return { 
    alpha: m[1].toUpperCase(),
    num: m[2] < 10 ? m[2].padStart(2, "0") : m[2]
  };
  return { alpha: s.toUpperCase(), num: "" };
}

function normalizeInput(rawInput) {
  const src = rawInput && typeof rawInput === "object" ? rawInput : {};
  const toStr = (v) => (v === null || v === undefined ? "" : String(v));
  const fields = [
    "cname", "ename", "no", "rgb",
    "s_cname", "s_ename",
    "p_cname", "p_ename", "p_dis", "p_kname", "p_jname", "p_kana", "p_no",
    "n_cname", "n_ename", "n_dis", "n_kname", "n_jname", "n_kana", "n_no",
    "area", "jname", "kana", "kname"
  ];
  const normalized = { ...src };
  for (const key of fields) {
    normalized[key] = toStr(normalized[key]);
  }
  for (const key of Object.keys(normalized)) {
    if (/(^|_)ename$/.test(key)) {
      normalized[`${key}_U`] = normalized[key].toUpperCase();
      normalized[`${key}_o`] = normalized[key].replace(/ō/g, "o").replace(/Ō/g, "O");
      normalized[`${key}_O`] = normalized[key].replace(/[ōŌ]/g, "O").toUpperCase();
    }
  }
  return normalized;
}

const STYLE_GUARD = true;

function defineStyle({ id, label_zh, label_ja, fields, fonts, render }) {
  const fieldSet = new Set(fields);
  const renderImpl = render;
  
  function isAllowedField(prop) {
    if (fieldSet.has(prop)) return true;
    if (prop.match(/_[oOU]$/)) {
      const base = prop.slice(0, -2);
      return fieldSet.has(base);
    }
    return false;
  }
  
  return {
    id,
    label_zh,
    label_ja,
    fields,
    fonts,
    render(rawInput) {
      const normalized = normalizeInput(rawInput);
      if (!STYLE_GUARD) return renderImpl(normalized);
      
      const guarded = new Proxy(normalized, {
        get(target, prop) {
          if (typeof prop !== "string") return target[prop];
          if (!isAllowedField(prop)) {
            throw new Error(`[${id}] 使用未宣告欄位: ${prop}`);
          }
          return target[prop] ?? "";
        }
      });
      
      return renderImpl(guarded);
    }
  };
}

const STYLES = [
  defineStyle({
    id: "trtc2",
    label_zh: "台北捷運 (新)",
    label_ja: "台北MRT（新）",
    fields: ["cname", "ename", "jname", "kname", "s_cname", "s_ename", "n_no", "rgb"],
    fonts: ["Font_GothicTW_M", "Font_GothicJP_M", "Font_GothicKR_M", "Font_Helvetica"],
    render(input) {
      const tmp = getMeasureCtx();
      const cW = textWidth(tmp, 54, "Font_GothicTW_M", input.cname);
      const jW = textWidth(tmp, 18, "Font_GothicJP_M", input.jname);
      const ejkW = Math.max(
        textWidth(tmp, 20, "Font_Helvetica", input.ename_U),
        jW + 15 + textWidth(tmp, 18, "Font_GothicKR_M", input.kname)
      );
      const nsp = input.n_no ? splitStationNo(input.n_no) : null;
      const noW = nsp ? 120 : 0;

      const sW = input.s_cname ? Math.max(
        textWidth(tmp, 28, "Font_GothicTW_M", input.s_cname),
        textWidth(tmp, 14, "Font_Helvetica", input.s_ename_U)
      ) + 30 : 0;

      const width = calWidth(400, 40, [noW + cW + sW, noW + ejkW]);
      const height = 200;
      console.log({c: cW, ejk: ejkW, s: sW, no: noW, w: width});
      
      const canvas = document.createElement("canvas");
      const ctx = initCanvas(canvas, width, height, '#f5ede6');

      if (nsp) {
        drawRoundRect(ctx, 40, 35, 100, 130, 10, input.rgb || "c80000");
        drawText(ctx, { size: 32, family: "Font_Helvetica", text: nsp.alpha, x: 90, y: 57, align: "center", color: "#fff" });
        drawText(ctx, { size: 32, family: "Font_Helvetica", text: nsp.num, x: 90, y: 103, align: "center", color: "#fff" });
      }

      ctx.fillStyle = "#444";
      drawText(ctx, { size: 54, family: "Font_GothicTW_M", text: input.cname, x: 39 + noW, y: 30, align: "left", color: '#444' });
      drawText(ctx, { size: 20, family: "Font_Helvetica", text: input.ename_U, x: 41 + noW, y: 110, align: "left", color: '#444' });
      drawText(ctx, { size: 18, family: "Font_GothicJP_M", text: input.jname, x: 40 + noW, y: 142, align: "left", color: '#444' });
      drawText(ctx, { size: 18, family: "Font_GothicKR_M", text: input.kname, x: 55 + noW + jW, y: 142, align: "left", color: '#444' });

      if (sW > 0) {
        ctx.fillRect(56 + noW + cW, 30, 1.5, 70);
        drawText(ctx, { size: 28, family: "Font_GothicTW_M", text: input.s_cname, x: 70 + noW + cW, y: 31, align: "left", color: '#444' });
        drawText(ctx, { size: 14, family: "Font_Helvetica", text: input.s_ename_U, x: 71 + noW + cW, y: 76, align: "left", color: '#444' });
      }
      
      return canvas;
    }
  }),
  defineStyle({
    id: "trtc",
    label_zh: "台北捷運 (原)",
    label_ja: "台北MRT（旧）",
    fields: ["cname", "ename", "s_cname", "s_ename", "rgb"],
    fonts: ["Font_MinchoTW_M", "Font_Optima"],
    render(input) {
      const rgb = hexToRgb(input.rgb || "c80000");
      
      const tmp = getMeasureCtx();
      const cwidth = textWidth(tmp, 48, "Font_MinchoTW_M", input.cname);
      const ewidth = textWidth(tmp, 22, "Font_Optima", input.ename_U);
      
      let sWidth = 0;
      if (input.s_cname || input.s_ename) {
        const scw = textWidth(tmp, 32, "Font_MinchoTW_M", input.s_cname);
        const sew = textWidth(tmp, 16, "Font_Optima", input.s_ename);
        sWidth = Math.max(scw, sew) + 100;
      }
      
      const width = calWidth(600, 30, [cwidth + ewidth + 20 + sWidth]);
      const height = 200;
      
      const canvas = document.createElement("canvas");
      const bg = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
      const ctx = initCanvas(canvas, width, height, bg);
      const fg = fgOnBg(rgb);
      
      const padding = Math.floor((width - sWidth - cwidth - ewidth - 20) / 2);
      drawText(ctx, { size: 48, family: "Font_MinchoTW_M", text: input.cname, x: padding, y: 64, align: "left", color: fg });
      drawText(ctx, { size: 48, family: "Font_MinchoTW_M", text: input.cname, x: padding, y: 64.3, align: "left", color: fg });
      drawText(ctx, { size: 48, family: "Font_MinchoTW_M", text: input.cname, x: padding, y: 64.6, align: "left", color: fg });
      drawText(ctx, { size: 22, family: "Font_Optima", text: input.ename_U, x: width - sWidth - padding, y: 100, align: "right", color: fg });
      drawText(ctx, { size: 22, family: "Font_Optima", text: input.ename_U, x: width - sWidth - padding + 0.3, y: 100, align: "right", color: fg });
      
      if (input.s_cname || input.s_ename) {
        const spos = width - sWidth / 2 - 20;
        drawText(ctx, { size: 32, family: "Font_MinchoTW_M", text: input.s_cname, x: spos, y: 58, align: "center", color: fg });
        drawText(ctx, { size: 16, family: "Font_Optima", text: input.s_ename, x: spos, y: 112, align: "center", color: fg });
        drawText(ctx, { size: 52, family: "Font_MinchoTW_M", text: "(", x: spos - sWidth / 2 + 30, y: 60, align: "right", color: fg });
        drawText(ctx, { size: 52, family: "Font_MinchoTW_M", text: ")", x: spos + sWidth / 2 - 47, y: 60, align: "left", color: fg });
      }
      
      return canvas;
    }
  }),
  defineStyle({
    id: "thsr",
    label_zh: "台灣高鐵",
    label_ja: "台湾高速鉄道",
    fields: ["cname", "ename"],
    fonts: ["Font_GothicTW_R", "Font_Helvetica"],
    render(input) {
      const tmp = getMeasureCtx();
      const cwidth = textWidth(tmp, 48, "Font_GothicTW_R", input.cname);
      const ewidth = textWidth(tmp, 30, "Font_GothicTW_R", input.ename);
      
      const width = calWidth(600, 50, [cwidth, ewidth]);
      const height = 200;
      
      const canvas = document.createElement("canvas");
      const ctx = initCanvas(canvas, width, height, "rgb(255,244,233)");
      
      drawText(ctx, { size: 48, family: "Font_GothicTW_R", text: input.cname, x: width / 2, y: 40, align: "center", color: "rgb(0,10,20)" });
      drawText(ctx, { size: 30, family: "Font_GothicTW_R", text: input.ename, x: width / 2, y: 114, align: "center", color: "rgb(0,10,20)" });
      
      return canvas;
    }
  }),
  defineStyle({
    id: "tti",
    label_zh: "桃園機場捷運 (出入口)",
    label_ja: "桃園空港MRT (出入口)",
    fields: ["cname", "ename", "no", "rgb"],
    fonts: ["Font_GothicTW_M", "Font_HelveticaBold"],
    render(input) {
      const cname = (input.cname.replace(/站$/, "") + "站").trim();
      const ename = (input.ename.replace(/ Station$/i, "") + " Station").trim();
      const rgb = hexToRgb(input.rgb || "7A68AE");
      
      const tmp = getMeasureCtx();
      const cwidth = textWidth(tmp, 36, "Font_GothicTW_M", cname);
      const ewidth = textWidth(tmp, 28, "Font_HelveticaBold", ename);
      const nwidth = textWidth(tmp, 88, "Font_HelveticaBold", input.no);
      const mWidth = Math.max(cwidth, ewidth);
      
      const width = calWidth(400, 80, [mWidth + 28 + nwidth]);
      const height = 180;
      
      const canvas = document.createElement("canvas");
      const bg = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
      const ctx = initCanvas(canvas, width, height, bg);
      const fg = fgOnBg(rgb);
      
      const mleft = (width - mWidth + nwidth) / 2 + 14;
      drawText(ctx, { size: 36, family: "Font_GothicTW_M", text: cname, x: mleft, y: 42, align: "left", color: fg });
      drawText(ctx, { size: 28, family: "Font_HelveticaBold", text: ename, x: mleft + 2, y: 102, align: "left", color: fg });
      drawText(ctx, { size: 88, family: "Font_HelveticaBold", text: input.no, x: mleft - 28, y: 40, align: "right", color: fg });
      
      return canvas;
    }
  }),
  defineStyle({
    id: "khmrt",
    label_zh: "高雄捷運",
    label_ja: "高雄MRT",
    fields: ["cname", "ename", "no", "s_cname", "s_ename", "rgb"],
    fonts: ["Font_MinchoTW_M", "Font_FrutigerBold", "Font_HelveticaBold"],
    render(input) {
      const rgb = hexToRgb(input.rgb || "E98B2A");
      
      const tmp = getMeasureCtx();
      const cwidth = textWidth(tmp, 48, "Font_MinchoTW_M", input.cname);
      const ewidth = textWidth(tmp, 22, "Font_FrutigerBold", input.ename);
      const width = calWidth(600, 30, [Math.max(cwidth, ewidth) + 220]);
      const height = 200;
      
      const canvas = document.createElement("canvas");
      const ctx = initCanvas(canvas, width, height, "#fff");
      ctx.fillStyle = "rgb(140,140,140)";
      ctx.fillRect(0, 134, width, 66);
      
      const lineColor = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
      const off = Math.floor((width - cwidth - 120) / 2);
      drawFilledCircle(ctx, off + 40, 70, 40, lineColor);
      
      drawText(ctx, { size: 48, family: "Font_MinchoTW_M", text: input.cname, x: off + 120, y: 40, align: "left", color: "#000" });
      drawText(ctx, { size: 23, family: "Font_HelveticaBold", text: input.no, x: off + 40, y: 57, align: "center", color: fgOnBg(rgb)});
      drawText(ctx, { size: 22, family: "Font_FrutigerBold", text: input.ename, x: width / 2, y: 154, align: "center", color: "#fff" });
      
      return canvas;
    }
  }),
  // defineStyle({
  //   id: "tairail1",
  //   label: "台鐵 (舊)",
  //   fields: ["cname", "ename", "p_cname", "p_dis", "n_cname", "n_dis", "rgb"],
  //   fonts: ["Font_Fude_Kanji", "Font_HelveticaBold"],
  //   render(input) {
  //     const tmp = getMeasureCtx();
  //     const width = calWidth(480, 40, [
  //       textWidth(tmp, 48, "Font_Fude_Kanji", input.cname),
  //       textWidth(tmp, 32, "Font_HelveticaBold", input.ename),
  //       textWidth(tmp, 24, "Font_Fude_Kanji", input.p_cname) + textWidth(tmp, 24, "Font_Fude_Kanji", input.n_cname) + 220
  //     ]);
  //     const height = 300;
      
  //     const canvas = document.createElement("canvas");
  //     const ctx = initCanvas(canvas, width, height, "#fff");
      
  //     const blue = "rgb(35,70,180)";
  //     const red = "rgb(200,40,30)";
  //     const cpos = width / 2;
  //     const pW = Math.max(56, textWidth(tmp, 24, "Font_Fude_Kanji", input.p_cname) + 20);
  //     const nW = Math.max(56, textWidth(tmp, 24, "Font_Fude_Kanji", input.n_cname) + 20);
      
  //     drawFilledPolygon(ctx, [[pW + 50, 200], [pW + 65, 170], [pW + 65, 230]], blue);
  //     drawFilledPolygon(ctx, [[width - nW - 50, 200], [width - nW - 65, 170], [width - nW - 65, 230]], blue);
  //     ctx.fillStyle = blue;
  //     ctx.fillRect(pW + 65, 190, width - nW - pW - 130, 20);
  //     ctx.fillRect(cpos - 2, 180, 4, 40);
      
  //     ctx.fillStyle = blue;
  //     ctx.fillRect(0, 264, Math.round(width * 0.7), 8);
  //     ctx.fillStyle = red;
  //     ctx.fillRect(Math.round(width * 0.7), 264, width - Math.round(width * 0.7), 8);
      
  //     drawText(ctx, { size: 48, family: "Font_Fude_Kanji", text: input.cname, x: cpos, y: 54, align: "center", color: "#000" });
  //     drawText(ctx, { size: 32, family: "Font_HelveticaBold", text: input.ename, x: cpos, y: 124, align: "center", color: "#000" });
      
  //     drawText(ctx, { size: 24, family: "Font_Fude_Kanji", text: input.p_cname, x: pW + 45, y: 186, align: "right", color: "#000" });
  //     drawText(ctx, { size: 18, family: "Font_HelveticaBold", text: input.p_dis ? `${input.p_dis} 公里` : "", x: pW + 45, y: 214, align: "right", color: "#000" });
  //     drawText(ctx, { size: 24, family: "Font_Fude_Kanji", text: input.n_cname, x: width - nW - 45, y: 186, align: "left", color: "#000" });
  //     drawText(ctx, { size: 18, family: "Font_HelveticaBold", text: input.n_dis ? `${input.n_dis} 公里` : "", x: width - nW - 45, y: 214, align: "left", color: "#000" });
      
  //     return canvas;
  //   }
  // }),
  defineStyle({
    id: "tairail2",
    label_zh: "台鐵 (新)",
    label_ja: "台湾鉄路（新）",
    fields: ["cname", "ename", "area", "p_cname", "p_ename", "p_dis", "n_cname", "n_ename", "n_dis"],
    fonts: ["Font_GothicTW_M", "Font_Helvetica"],
    render(input) {
      let area = input.area || "";
      const pName = (input.p_cname || "") + (input.p_ename ? ` ${input.p_ename}` : "");
      const nName = (input.n_cname || "") + (input.n_ename ? ` ${input.n_ename}` : "");
      const pDis = input.p_dis ? `${input.p_dis}公里(km)` : "";
      const nDis = input.n_dis ? `${input.n_dis}公里(km)` : "";
      
      let areaLines = [];
      if (area) {
        area = area.length === 6
        ? [area.slice(0, 3), area.slice(3, 6)]
        : area.replace(/([市縣県都府道])/, "$1\n").split("\n");
        areaLines = area.filter(Boolean);
      }
      
      const tmp = getMeasureCtx();
      const cwidth = textWidth(tmp, 52, "Font_GothicTW_M", input.cname);
      const ewidth = textWidth(tmp, 22, "Font_Helvetica", input.ename);
      const pwidth = textWidth(tmp, 20, ["Font_Helvetica", "Font_GothicTW_M"], pName);
      const nwidth = textWidth(tmp, 20, ["Font_Helvetica", "Font_GothicTW_M"], nName);
      const pdwidth = textWidth(tmp, 20, ["Font_Helvetica", "Font_GothicTW_M"], pDis);
      const ndwidth = textWidth(tmp, 20, ["Font_Helvetica", "Font_GothicTW_M"], nDis);
      
      const areaBoxW = areaLines.length ? Math.max(...areaLines.map((l) => textWidth(tmp, 14, "Font_GothicTW_M", l))) : 0;
      const areaBoxH = areaLines.length ? areaLines.length * 20 : 0;
      
      const width = calWidth(600, 20, [
        Math.max(cwidth, ewidth) + (areaBoxW + 60) * 2,
        pwidth + nwidth + 40,
        pdwidth + ndwidth + 100
      ], 50);
      
      const height = 240;
      
      const canvas = document.createElement("canvas");
      const ctx = initCanvas(canvas, width, height, "#fff");
      ctx.fillStyle = "rgb(40,180,40)";
      ctx.fillRect(0, 130, width, 46);
      
      if (areaLines.length) {
        const aLeft = width / 2 + Math.max(cwidth, ewidth) / 2 + 20;
        const boxTop = 115 - areaBoxH - 20;
        drawRoundRect(ctx, aLeft, boxTop, areaBoxW + 20, areaBoxH + 20, 10, "rgb(0,70,180)");
        drawRoundRect(ctx, aLeft + 2, boxTop + 2, areaBoxW + 16, areaBoxH + 16, 8, "#fff");
        areaLines.forEach((line, i) => {
          drawText(ctx, { size: 14, family: "Font_GothicTW_M", text: line, x: aLeft + 10, y: boxTop + 10 + i * 20, align: "left", color: "#000" });
        });
      }
      
      if (pName || pDis) {
        drawFilledPolygon(ctx, [[20, 152], [44, 137], [44, 167]], "#111");
      }
      if (nName || nDis) {
        drawFilledPolygon(ctx, [[width - 20, 152], [width - 44, 137], [width - 44, 167]], "#111");
      }
      
      drawText(ctx, { size: 52, family: "Font_GothicTW_M", text: input.cname, x: width / 2, y: 20, align: "center", color: "#111" });
      drawText(ctx, { size: 22, family: "Font_Helvetica", text: input.ename, x: width / 2, y: 92, align: "center", color: "#111" });
      
      drawText(ctx, { size: 20, family: ["Font_Helvetica", "Font_GothicTW_M"], text: pName, x: 20, y: 185, align: "left", color: "#111" });
      drawText(ctx, { size: 20, family: ["Font_Helvetica", "Font_GothicTW_M"], text: pDis, x: 55, y: 140, align: "left", color: "#111" });
      
      drawText(ctx, { size: 20, family: ["Font_Helvetica", "Font_GothicTW_M"], text: nName, x: width - 20, y: 184, align: "right", color: "#111" });
      drawText(ctx, { size: 20, family: ["Font_Helvetica", "Font_GothicTW_M"], text: nDis, x: width - 55, y: 140, align: "right", color: "#111" });
      return canvas;
    }
  }),
  defineStyle({
    id: "jreast",
    label_zh: "JR東日本",
    label_ja: "JR東日本",
    fields: ["jname", "ename", "kana", "rgb", "p_jname", "p_ename", "n_jname", "n_ename"],
    fonts: ["Font_GothicJP_M", "Font_FrutigerMedium", "Font_HelveticaBold"],
    render(input) {
      const rgb = hexToRgb(input.rgb || "30A030");
      
      const tmp = getMeasureCtx();
      const eWidth = textWidth(tmp, 20, "Font_FrutigerMedium", input.ename);
      const mainW = Math.max(textWidth(tmp, 40, "Font_GothicJP_M", input.jname), textWidth(tmp, 18, "Font_GothicJP_M", input.kana));
      const npCW = Math.max(textWidth(tmp, 24, "Font_GothicJP_M", input.n_jname), textWidth(tmp, 18, "Font_GothicJP_M", input.p_jname));
      const npEW = Math.max(textWidth(tmp, 14, "Font_FrutigerMedium", input.n_ename), textWidth(tmp, 14, "Font_FrutigerMedium", input.p_ename));
      const width = calWidth(600, 20, [eWidth + npEW * 2 + 80, mainW, npCW * 2 + 80]);
      const height = 240;
      
      const canvas = document.createElement("canvas");
      const ctx = initCanvas(canvas, width, height, "#fff");
      
      const green = "rgb(30,120,0)";
      const hasPrev = Boolean(input.p_jname || input.p_ename);
      const hasNext = Boolean(input.n_jname || input.n_ename);
      if (hasNext) {
        drawFilledPolygon(ctx, [[0, 140], [width - 30, 140], [width - 10, 160], [width - 30, 180], [0, 180]], green);
      } else if (hasPrev) {
        drawFilledPolygon(ctx, [[width, 140], [30, 140], [10, 160], [30, 180], [width, 180]], green);
      } else {
        ctx.fillStyle = green;
        ctx.fillRect(0, 140, width, 40);
      }
      
      ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
      ctx.fillRect(width / 2 - 20, 140, 40, 40);
      
      drawText(ctx, { size: 18, family: "Font_GothicJP_M", text: input.kana, x: width / 2, y: 100, align: "center", color: "#000" });
      drawText(ctx, { size: 40, family: "Font_GothicJP_M", text: input.jname, x: width / 2, y: 40, align: "center", color: "#000" });
      drawText(ctx, { size: 20, family: "Font_HelveticaBold", text: input.ename, x: width / 2, y: 190, align: "center", color: "#000" });
      
      drawText(ctx, { size: 18, family: "Font_GothicJP_M", text: input.p_jname, x: hasNext ? 20 : 40, y: 146, align: "left", color: "#fff" });
      drawText(ctx, { size: 24, family: "Font_GothicJP_M", text: input.n_jname, x: width - 40, y: 144, align: "right", color: "#fff" });
      
      drawText(ctx, { size: 14, family: "Font_HelveticaBold", text: input.p_ename, x: hasNext ? 20 : 40, y: 195, align: "left", color: "#000" });
      drawText(ctx, { size: 14, family: "Font_HelveticaBold", text: input.n_ename, x: width - 40, y: 195, align: "right", color: "#000" });
      
      return canvas;
    }
  }),
  defineStyle({
    id: "jrtokai",
    label_zh: "JR東海",
    label_ja: "JR東海",
    fields: ["jname", "ename", "kana", "area", "p_kana", "p_ename", "n_kana", "n_ename"],
    fonts: ["Font_JNR_Kana", "Font_JNR_Kanji", "Font_FrutigerMedium", "Font_Helvetica"],
    render(input) {
      const area = input.area ? `（${input.area}）` : "";
      
      const tmp = getMeasureCtx();
      const pWidth = Math.max(textWidth(tmp, 18, "Font_JNR_Kana", input.p_kana), textWidth(tmp, 14, "Font_Helvetica", input.p_ename));
      const nWidth = Math.max(textWidth(tmp, 18, "Font_JNR_Kana", input.n_kana), textWidth(tmp, 14, "Font_Helvetica", input.n_ename));
      const mainW = Math.max(textWidth(tmp, 44, "Font_JNR_Kana", input.kana), textWidth(tmp, 24, "Font_JNR_Kanji", input.jname) + textWidth(tmp, 22, "Font_FrutigerMedium", input.ename) + 20);
      const areaW = textWidth(tmp, 19, "Font_JNR_Kanji", area);
      const width = calWidth(600, 20, [mainW, areaW + pWidth + nWidth + 80]);
      const height = 240;
      
      const canvas = document.createElement("canvas");
      const ctx = initCanvas(canvas, width, height, "#fff");
      ctx.fillStyle = "rgb(240,100,0)";
      ctx.fillRect(0, 126, width, 34);
      
      drawText(ctx, { size: 44, family: "Font_JNR_Kana", text: input.kana, x: width / 2, y: 20, align: "center", color: "#000" });
      drawText(ctx, { size: 24, family: "Font_JNR_Kanji", text: input.jname, x: width / 2, y: 83, align: "center", color: "#000" });
      drawText(ctx, { size: 22, family: "Font_FrutigerMedium", text: input.ename, x: width / 2, y: 132, align: "center", color: "#fff" });
      drawText(ctx, { size: 19, family: "Font_JNR_Kanji", text: area, x: width / 2, y: 178, align: "center", color: "#000" });
      
      drawText(ctx, { size: 18, family: "Font_JNR_Kana", text: input.p_kana, x: 18, y: 170, align: "left", color: "#000" });
      drawText(ctx, { size: 14, family: "Font_Helvetica", text: input.p_ename, x: 18, y: 202, align: "left", color: "#000" });
      drawText(ctx, { size: 18, family: "Font_JNR_Kana", text: input.n_kana, x: width - 18, y: 170, align: "right", color: "#000" });
      drawText(ctx, { size: 14, family: "Font_Helvetica", text: input.n_ename, x: width - 18, y: 202, align: "right", color: "#000" });
      
      return canvas;
    }
  }),
  defineStyle({
    id: "jnr",
    label_zh: "日本國有鐵道",
    label_ja: "日本国有鉄道",
    fields: ["jname", "ename", "kana", "area", "p_kana", "p_ename", "n_kana", "n_ename"],
    fonts: ["Font_JNR_Kana", "Font_JNR_Kanji", "Font_OldBlack"],
    render(input) {
      const area = input.area ? `（${input.area}）` : "";
      
      const tmp = getMeasureCtx();
      const pWidth = Math.max(textWidth(tmp, 22, "Font_JNR_Kana", input.p_kana), textWidth(tmp, 20, "Font_OldBlack", input.p_ename_U));
      const nWidth = Math.max(textWidth(tmp, 22, "Font_JNR_Kana", input.n_kana), textWidth(tmp, 20, "Font_OldBlack", input.n_ename_U));
      const width = calWidth(300, 40, [
        textWidth(tmp, 48, "Font_JNR_Kana", input.kana),
        textWidth(tmp, 24, "Font_JNR_Kanji", input.jname),
        textWidth(tmp, 34, "Font_OldBlack", input.ename_U),
        textWidth(tmp, 19, "Font_JNR_Kanji", area),
        pWidth + nWidth + 16
      ], 10);
      const height = 270;
      
      const canvas = document.createElement("canvas");
      const ctx = initCanvas(canvas, width, height, "rgb(240,240,240)");
      ctx.fillStyle = "#111";
      
      const cpos = (width + pWidth - nWidth) / 2;
      const ppos = cpos / 2 - 5;
      const npos = (width + cpos) / 2 + 5;
      
      ctx.fillRect(12, 189.5, width - 24, 3);
      ctx.fillRect(cpos - 1.5, 190, 3, 70);
      drawFilledPolygon(ctx, [[10, 191], [20, 185], [16, 191], [20, 197]], "#111");
      drawFilledPolygon(ctx, [[width - 10, 191], [width - 20, 185], [width - 16, 191], [width - 20, 197]], "#111");
      
      drawText(ctx, { size: 48, family: "Font_JNR_Kana", text: input.kana, x: width / 2, y: 10, align: "center", color: "#000" });
      drawText(ctx, { size: 24, family: "Font_JNR_Kanji", text: input.jname, x: width / 2, y: 75, align: "center", color: "#000" });
      drawText(ctx, { size: 34, family: "Font_OldBlack", text: input.ename_U, x: width / 2, y: 110, align: "center", color: "#000" });
      drawText(ctx, { size: 19, family: "Font_JNR_Kanji", text: area, x: width / 2, y: 155, align: "center", color: "#000" });
      
      drawText(ctx, { size: 22, family: "Font_JNR_Kana", text: input.p_kana, x: ppos, y: 200, align: "center", color: "#000" });
      drawText(ctx, { size: 20, family: "Font_OldBlack", text: input.p_ename_U, x: ppos, y: 232, align: "center", color: "#000" });
      drawText(ctx, { size: 22, family: "Font_JNR_Kana", text: input.n_kana, x: npos, y: 200, align: "center", color: "#000" });
      drawText(ctx, { size: 20, family: "Font_OldBlack", text: input.n_ename_U, x: npos, y: 232, align: "center", color: "#000" });
      
      return canvas;
    }
  }),
  defineStyle({
    id: "jnr2",
    label_zh: "鐵道省國有鐵道",
    label_ja: "鉄道省国有鉄道",
    fields: ["jname", "ename", "kana", "p_kana", "p_ename", "n_kana", "n_ename"],
    fonts: ["Font_Fude_Eki", "Font_Fude_Kanji", "Font_OldBlack", "Font_GothicJP_M"],
    render(input) {
      const kana = [...input.kana].reverse().join("");
      const jname = [...input.jname].reverse().join("");
      const pKana = [...input.p_kana].reverse().join("");
      const nKana = [...input.n_kana].reverse().join("");
      
      const tmp = getMeasureCtx();
      const pWidth = Math.max(textWidth(tmp, 22, "Font_Fude_Eki", pKana), textWidth(tmp, 20, "Font_OldBlack", input.p_ename_U));
      const nWidth = Math.max(textWidth(tmp, 22, "Font_Fude_Eki", nKana), textWidth(tmp, 20, "Font_OldBlack", input.n_ename_U));
      const handW = textWidth(tmp, 50, "Font_GothicJP_M", '☜');
      const width = calWidth(300, 40, [
        textWidth(tmp, 48, "Font_Fude_Eki", kana),
        textWidth(tmp, 26, "Font_Fude_Kanji", jname),
        textWidth(tmp, 34, "Font_OldBlack", input.ename_U),
        pWidth + nWidth + 16 + handW * 2
      ], 10);
      const height = 240;
      
      const canvas = document.createElement("canvas");
      const ctx = initCanvas(canvas, width, height, "rgb(240,240,240)");
      ctx.fillStyle = "#111";
      
      const cpos = (width + pWidth - nWidth) / 2;
      const ppos = pWidth / 2 + 40;
      const npos = width - (nWidth / 2) - 40;
      
      ctx.fillRect(12, 159.5, width - 24, 3);
      ctx.fillRect(cpos - 1.5, 160, 3, 70);
      
      drawText(ctx, { size: 48, family: "Font_Fude_Eki", text: kana, x: width / 2, y: 10, align: "center", color: "#000" });
      drawText(ctx, { size: 26, family: "Font_Fude_Kanji", text: jname, x: width / 2, y: 75, align: "center", color: "#000" });
      drawText(ctx, { size: 34, family: "Font_OldBlack", text: input.ename_U, x: width / 2, y: 112, align: "center", color: "#000" });
      
      if (pKana || input.p_ename_U) {
        drawText(ctx, { size: 50, family: "Font_GothicJP_M", text: '☜', x: cpos+2, y: 152, align: "right", color: "#000" });
      }
      if (nKana || input.n_ename_U) {
        drawText(ctx, { size: 50, family: "Font_GothicJP_M", text: '☞', x: cpos-2, y: 152, align: "left", color: "#000" });
      }
      
      drawText(ctx, { size: 22, family: "Font_Fude_Eki", text: pKana, x: ppos, y: 170, align: "center", color: "#000" });
      drawText(ctx, { size: 20, family: "Font_OldBlack", text: input.p_ename_U, x: ppos, y: 204, align: "center", color: "#000" });
      drawText(ctx, { size: 22, family: "Font_Fude_Eki", text: nKana, x: npos, y: 170, align: "center", color: "#000" });
      drawText(ctx, { size: 20, family: "Font_OldBlack", text: input.n_ename_U, x: npos, y: 204, align: "center", color: "#000" });
      
      return canvas;
    }
  }),
  defineStyle({
    id: "tokyometro",
    label_zh: "東京Metro",
    label_ja: "東京メトロ",
    fields: ["jname", "ename", "kana", "no", "n_no", "rgb", "p_jname", "p_kana", "p_ename", "n_jname", "n_kana", "n_ename"],
    fonts: ["Font_GothicJP_M", "Font_FrutigerMedium", "Font_FuturaBold"],
    render(input) {
      const rgb = hexToRgb(input.rgb || "009944");
      
      const tmp = getMeasureCtx();
      const mWidth = Math.max(
        textWidth(tmp, 42, "Font_GothicJP_M", input.jname),
        textWidth(tmp, 20, "Font_GothicJP_M", input.kana),
        textWidth(tmp, 20, "Font_FrutigerMedium", input.ename)
      );
      const npWidth = Math.max(
        textWidth(tmp, 20, "Font_GothicJP_M", input.p_jname),
        textWidth(tmp, 14, "Font_GothicJP_M", input.p_kana),
        textWidth(tmp, 14, "Font_FrutigerMedium", input.p_ename),
        textWidth(tmp, 20, "Font_GothicJP_M", input.n_jname),
        textWidth(tmp, 14, "Font_GothicJP_M", input.n_kana),
        textWidth(tmp, 14, "Font_FrutigerMedium", input.n_ename)
      );
      const width = calWidth(600, 20, [npWidth * 2 + mWidth + 60]);
      const height = 240;
      
      const canvas = document.createElement("canvas");
      const ctx = initCanvas(canvas, width, height, "#fafafa");
      
      const lineColor = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
      ctx.fillStyle = lineColor;
      ctx.fillRect(0, 160, width, 80);
      
      if (input.no) {
        drawFilledCircle(ctx, width / 2, 200, 35, "#fafafa");
        drawFilledCircle(ctx, width / 2, 200, 33.5, lineColor);
        drawFilledCircle(ctx, width / 2, 200, 30, "#fafafa");
        const sp = splitStationNo(input.no);
        if (sp.alpha && sp.num) {
          drawText(ctx, { size: 20, family: "Font_FuturaBold", text: sp.alpha, x: width / 2, y: 179, align: "center", color: "#000" });
          drawText(ctx, { size: 20, family: "Font_FuturaBold", text: sp.num, x: width / 2, y: 203, align: "center", color: "#000" });
        } else {
          drawText(ctx, { size: 20, family: "Font_FuturaBold", text: input.no, x: width / 2, y: 190, align: "center", color: "#000" });
        }
      }
      
      if (input.n_jname && input.n_no) {
        drawFilledCircle(ctx, width - 40, 200, 29, "#fafafa");
        drawFilledCircle(ctx, width - 40, 200, 27.5, lineColor);
        drawFilledCircle(ctx, width - 40, 200, 24.5, "#fafafa");
        const nsp = splitStationNo(input.n_no);
        if (nsp.alpha && nsp.num) {
          drawText(ctx, { size: 16, family: "Font_FuturaBold", text: nsp.alpha, x: width - 40, y: 183, align: "center", color: "#000" });
          drawText(ctx, { size: 16, family: "Font_FuturaBold", text: nsp.num, x: width - 40, y: 203, align: "center", color: "#000" });
        } else {
          drawText(ctx, { size: 16, family: "Font_FuturaBold", text: input.n_no, x: width - 40, y: 193, align: "center", color: "#000" });
        }
      }
      
      if (input.n_jname || input.n_no) {
        drawFilledPolygon(ctx, [
          [width - 20, 40], [width - 40, 20], [width - 48, 20], [width - 31, 37], [width - 65, 37], [width - 65, 43], [width - 31, 43], [width - 48, 60], [width - 40, 60],
        ], "#000");
      }
      
      drawText(ctx, { size: 42, family: "Font_GothicJP_M", text: input.jname, x: width / 2, y: 20, align: "center", color: "#000" });
      drawText(ctx, { size: 20, family: "Font_GothicJP_M", text: input.kana, x: width / 2, y: 88, align: "center", color: "#000" });
      drawText(ctx, { size: 20, family: "Font_FrutigerMedium", text: input.ename, x: width / 2, y: 125, align: "center", color: "#000" });
      
      drawText(ctx, { size: 20, family: "Font_GothicJP_M", text: input.p_jname, x: 20, y: 74, align: "left", color: "#000" });
      drawText(ctx, { size: 14, family: "Font_GothicJP_M", text: input.p_kana, x: 20, y: 106, align: "left", color: "#000" });
      drawText(ctx, { size: 14, family: "Font_FrutigerMedium", text: input.p_ename, x: 20, y: 130, align: "left", color: "#000" });
      
      drawText(ctx, { size: 20, family: "Font_GothicJP_M", text: input.n_jname, x: width - 20, y: 74, align: "right", color: "#000" });
      drawText(ctx, { size: 14, family: "Font_GothicJP_M", text: input.n_kana, x: width - 20, y: 106, align: "right", color: "#000" });
      drawText(ctx, { size: 14, family: "Font_FrutigerMedium", text: input.n_ename, x: width - 20, y: 130, align: "right", color: "#000" });
      
      return canvas;
    }
  }),
  defineStyle({
    id: "hankyu",
    label_zh: "阪急電鐵",
    label_ja: "阪急電鉄",
    fields: ["jname", "ename", "kana", "s_cname", "p_kana", "p_ename", "n_kana", "n_ename"],
    fonts: ["Font_OldMaruGothicJP_M", "Font_NewMaruGothicJP_M"],
    render(input) {
      const sCname = input.s_cname ? `（${input.s_cname}）` : "";
      const tmp = getMeasureCtx();
      const pWidth = Math.max(textWidth(tmp, 18, "Font_OldMaruGothicJP_M", input.p_kana), textWidth(tmp, 14, "Font_NewMaruGothicJP_M", input.p_ename_U));
      const nWidth = Math.max(textWidth(tmp, 18, "Font_OldMaruGothicJP_M", input.n_kana), textWidth(tmp, 14, "Font_NewMaruGothicJP_M", input.n_ename_U));
      
      const width = calWidth(520, 25, [
        textWidth(tmp, 44, "Font_OldMaruGothicJP_M", input.kana),
        textWidth(tmp, 24, "Font_NewMaruGothicJP_M", input.jname),
        textWidth(tmp, 22, "Font_NewMaruGothicJP_M", input.ename_U),
        textWidth(tmp, 22, "Font_NewMaruGothicJP_M", sCname),
        pWidth + nWidth + 180
      ]);
      const height = 360;
      
      const canvas = document.createElement("canvas");
      const ctx = initCanvas(canvas, width, height);
      
      drawRoundRect(ctx, 0, 0, width, height, 30, "rgb(25,0,80)");
      ctx.fillStyle = "#fff";
      ctx.fillRect(25, 250, width - 50, 2);
      
      if (input.p_kana || input.p_ename_U) {
        drawFilledPolygon(ctx, [[25, 300], [70, 275], [55, 300], [70, 325]], "#fff");
        drawFilledPolygon(ctx, [[27, 300], [68, 277], [53, 300], [68, 323]], "rgb(200,20,20)");
      }
      if (input.n_kana || input.n_ename_U) {
        drawFilledPolygon(ctx, [[width - 25, 300], [width - 70, 275], [width - 55, 300], [width - 70, 325]], "#fff");
        drawFilledPolygon(ctx, [[width - 27, 300], [width - 68, 277], [width - 53, 300], [width - 68, 323]], "rgb(200,20,20)");
      }
      
      drawText(ctx, { size: 44, family: "Font_OldMaruGothicJP_M", text: input.kana, x: width / 2, y: 48, align: "center", color: "#fff" });
      drawText(ctx, { size: 24, family: "Font_NewMaruGothicJP_M", text: input.jname, x: width / 2, y: 115, align: "center", color: "#fff" });
      drawText(ctx, { size: 22, family: "Font_NewMaruGothicJP_M", text: sCname, x: width / 2, y: 150, align: "center", color: "#fff" });
      drawText(ctx, { size: 22, family: "Font_NewMaruGothicJP_M", text: input.ename_U, x: width / 2, y: 200, align: "center", color: "#fff" });
      
      drawText(ctx, { size: 18, family: "Font_OldMaruGothicJP_M", text: input.p_kana, x: 82, y: 275, align: "left", color: "#fff" });
      drawText(ctx, { size: 14, family: "Font_NewMaruGothicJP_M", text: input.p_ename_U, x: 82, y: 308, align: "left", color: "#fff" });
      drawText(ctx, { size: 18, family: "Font_OldMaruGothicJP_M", text: input.n_kana, x: width - 82, y: 275, align: "right", color: "#fff" });
      drawText(ctx, { size: 14, family: "Font_NewMaruGothicJP_M", text: input.n_ename_U, x: width - 82, y: 308, align: "right", color: "#fff" });
      
      return canvas;
    }
  }),
  // defineStyle({
  //   id: "keisei",
  //   label: "京成電鉄",
  //   fields: ["jname", "ename", "p_jname", "p_ename", "n_jname", "n_ename", "rgb"],
  //   fonts: ["Font_NewMaruGothicJP_M", "Font_Helvetica"],
  //   render(input) {
  //     const tmp = getMeasureCtx();
  //     const mW = Math.max(
  //       textWidth(tmp, 58, "Font_OldMaruGothicJP_M",  input.jname),
  //       textWidth(tmp, 18, "Font_Helvetica", input.ename)
  //     );
  //     const width = calWidth(500, 40, [mW + 220], 50);
  //     const height = 200;
      
  //     const canvas = document.createElement("canvas");
  //     const ctx = initCanvas(canvas, width, height, "#fff");
      
  //     const blue = "rgb(0,85,180)";
      
  //     const pW = Math.max(45, textWidth(tmp, 14, "Font_MaruGothicJP_M", input.p_jname) + 20);
  //     ctx.fillStyle = blue;
  //     ctx.fillRect(0, 80, 65 + pW, 40);
      
  //     const nPos = width - 95;
  //     drawFilledPolygon(ctx, [[width - 4, 120], [width - 44, 80], [nPos + 20, 80], [nPos + 20, 120]], blue);
  //     drawRoundRect(ctx, nPos - 14, 80, 28, 40, 5, blue);
      
  //     const centerX = width / 2;
  //     drawText(ctx, { size: 58, family: "Font_OldMaruGothicJP_M", text: input.jname, x: centerX, y: 20, align: "center", color: "#000" });
  //     drawText(ctx, { size: 18, family: "Font_Helvetica", text: input.ename, x: centerX, y: 130, align: "center", color: "#000" });
  //     drawText(ctx, { size: 14, family: "Font_OldMaruGothicJP_M", text: input.p_jname, x: 12, y: 86, align: "left", color: "#fff" });
  //     drawText(ctx, { size: 14, family: "Font_Helvetica", text: input.p_ename, x: 12, y: 102, align: "left", color: "#fff" });
  //     drawText(ctx, { size: 14, family: "Font_OldMaruGothicJP_M", text: input.n_jname, x: width - 48, y: 86, align: "center", color: "#fff" });
  //     drawText(ctx, { size: 14, family: "Font_Helvetica", text: input.n_ename, x: width - 48, y: 102, align: "center", color: "#fff" });
      
  //     return canvas;
  //   }
  // }),
  defineStyle({
    id: "izukyu",
    label_zh: "伊豆急行",
    label_ja: "伊豆急行",
    fields: ["jname", "ename", "kana", "kname", "p_jname", "p_ename", "p_kname", "n_jname", "n_ename", "n_kname"],
    fonts: ["Font_GothicJP_M", "Font_GothicKR_M", "Font_HelveticaBold"],
    render(input) {
      const p_ekname = `${input.p_ename}  ${input.p_kname}`.trim();
      const n_ekname = `${input.n_kname}  ${input.n_ename}`.trim();

      const tmp = getMeasureCtx();
      const eW = textWidth(tmp, 20, "Font_HelveticaBold", input.ename);
      const npJW = Math.max( textWidth(tmp, 20, "Font_GothicJP_M", input.p_jname), textWidth(tmp, 20, "Font_GothicJP_M", input.n_jname) );
      const npEW = Math.max(
        textWidth(tmp, 14, ["Font_HelveticaBold", "Font_GothicKR_M"], p_ekname),
        textWidth(tmp, 14, ["Font_HelveticaBold", "Font_GothicKR_M"], n_ekname)
      );

      const width = calWidth(600, 40, [
        textWidth(tmp, 44, "Font_GothicJP_M", input.jname),
        textWidth(tmp, 23, "Font_GothicJP_M", input.kana),
        eW + 140,
        npJW * 2 + textWidth(tmp, 18, "Font_GothicKR_M", input.kname) + 40,
        npEW * 2
      ]);
      const height = 240;
      
      const canvas = document.createElement("canvas");
      const ctx = initCanvas(canvas, width, height, "#fff");
      
      drawFilledPolygon(ctx, [[0, 130], [(width - eW) / 2 - 10, 130], [(width - eW) / 2 - 38, 158], [0, 158]], "rgb(200,20,0)");
      drawFilledPolygon(ctx, [[width, 130], [(width + eW) / 2 + 38, 130], [(width + eW) / 2 + 10, 158], [width, 158]], "rgb(0,20,200)");
      
      drawText(ctx, { size: 44, family: "Font_GothicJP_M", text: input.jname, x: width / 2, y: 30, align: "center", color: "#000" });
      drawText(ctx, { size: 23, family: "Font_GothicJP_M", text: input.kana, x: width / 2, y: 95, align: "center", color: "#000" });
      drawText(ctx, { size: 20, family: "Font_HelveticaBold", text: input.ename, x: width / 2, y: 132, align: "center", color: "#000" });
      drawText(ctx, { size: 16, family: "Font_GothicKR_M", text: input.kname, x: width / 2, y: 163, align: "center", color: "#000" });
      
      drawText(ctx, { size: 20, family: "Font_GothicJP_M", text: input.p_jname, x: 20, y: 164, align: "left", color: "#000" });
      drawText(ctx, { size: 14, family: ["Font_HelveticaBold", "Font_GothicKR_M"], text: p_ekname, x: 20, y: 196, align: "left", color: "#000" });
      drawText(ctx, { size: 20, family: "Font_GothicJP_M", text: input.n_jname, x: width - 20, y: 164, align: "right", color: "#000" });
      drawText(ctx, { size: 14, family: ["Font_HelveticaBold", "Font_GothicKR_M"], text: n_ekname, x: width - 20, y: 196, align: "right", color: "#000" });

      return canvas;
    }
  }),
  defineStyle({
    id: "kotoden",
    label_zh: "高松琴平電鐵",
    label_ja: "高松琴平電鉄",
    fields: ["jname", "ename", "kana", "rgb", "p_kana", "n_kana"],
    fonts: ["Font_GothicJP_M", "Font_OldGothicJP_R", "Font_Helvetica"],
    render(input) {
      const rgb = hexToRgb(input.rgb || "009944");
      
      const tmp = getMeasureCtx();
      const width = calWidth(480, 40, [
        textWidth(tmp, 56, "Font_GothicJP_M", input.jname),
        textWidth(tmp, 14, "Font_OldGothicJP_R", input.kana),
        textWidth(tmp, 22, "Font_Helvetica", input.ename),
        textWidth(tmp, 18, "Font_OldGothicJP_R", input.p_kana) + textWidth(tmp, 18, "Font_OldGothicJP_R", input.n_kana) + 80
      ], 20);
      const height = 320;
      
      const canvas = document.createElement("canvas");
      const ctx = initCanvas(canvas, width, height, "#fff");
      
      const lineColor = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
      ctx.fillStyle = lineColor;
      ctx.fillRect(0, 240, width, 80);
      
      drawFilledPolygon(ctx, [[20, 200], [53, 180], [53, 220]], lineColor);
      drawFilledPolygon(ctx, [[width - 20, 200], [width - 53, 180], [width - 53, 220]], lineColor);

      const num = Math.floor((width - 120) / 36);
      const offx = ((width - 120) % (num * 36)) / 2 + 78;
      for (let x = 0; x < num; x++) drawFilledCircle(ctx, offx + x * 36, 200, 9, lineColor);
      
      drawText(ctx, { size: 14, family: "Font_OldGothicJP_R", text: input.kana, x: width / 2, y: 30, align: "center", color: "#000" });
      drawText(ctx, { size: 56, family: "Font_GothicJP_M", text: input.jname, x: width / 2, y: 56, align: "center", color: "#000" });
      drawText(ctx, { size: 22, family: "Font_Helvetica", text: input.ename, x: width / 2, y: 140, align: "center", color: "#000" });
      drawText(ctx, { size: 21, family: "Font_OldGothicJP_R", text: input.p_kana, x: 18, y: 266, align: "left", color: "#fff" });
      drawText(ctx, { size: 21, family: "Font_OldGothicJP_R", text: input.n_kana, x: width - 18, y: 266, align: "right", color: "#fff" });
      
      return canvas;
    }
  }),
  defineStyle({
    id: "korail",
    label_zh: "KORAIL韓國鐵道",
    label_ja: "KORAIL韓国鉄道",
    fields: ["cname", "ename", "kname", "p_cname", "p_ename", "p_kname", "n_cname", "n_ename", "n_kname"],
    fonts: ["Font_KORAIL", "Font_GothicKR_M"],
    render(input) {
      function calWidthKorail(tmp, kname, ename, cname, ksize, esize, csize, padding, min=0) {
        const kw = textWidth(tmp, ksize, "Font_KORAIL", kname);
        const ew = textWidth(tmp, esize, "Font_KORAIL", ename);
        const cw = textWidth(tmp, csize, "Font_GothicKR_M", cname);
        return {bar: Math.round(Math.max(kw, ew + cw + padding, min)), e: Math.round(ew), c: Math.round(cw), k: Math.round(kw)};
      }
      
      function drawKorailBlock(ctx, mx, xoff, yoff, kname, ename, cname, ksize, esize, csize, lineWidth, alignCenter) {
        const left = xoff;
        const right = xoff + mx.bar;
        const center = xoff + Math.floor(mx.bar / 2);
        const lineTop = yoff + Math.ceil(ksize * 1.45);
        const sep = left + mx.e + (mx.bar - mx.e - mx.c - lineWidth) / 2;
        const ectop = lineTop + Math.ceil(esize * 0.5);
        
        ctx.fillStyle = "#fff";
        ctx.fillRect(left, lineTop, right - left, lineWidth);
        ctx.fillRect(sep - 1, lineTop, lineWidth, esize*2);
        if (alignCenter) {
          drawText(ctx, { size: ksize, family: "Font_KORAIL", text: kname, x: center, y: yoff, align: "center", color: "#fff" });
        } else {
          drawText(ctx, { size: ksize, family: "Font_KORAIL", text: kname, x: left-1, y: yoff, align: "left", color: "#fff" });
        }
        drawText(ctx, { size: esize, family: "Font_KORAIL", text: ename, x: left, y: ectop, align: "left", color: "#fff" });
        drawText(ctx, { size: csize, family: "Font_GothicKR_M", text: cname, x: right, y: ectop, align: "right", color: "#fff" });
      }
      
      const tmp = getMeasureCtx();
      const pMx = input.p_kname || input.p_ename || input.p_cname ? calWidthKorail(tmp, input.p_kname, input.p_ename_o, input.p_cname, 30, 14, 14, 12) : null;
      const nMx = input.n_kname || input.n_ename || input.n_cname ? calWidthKorail(tmp, input.n_kname, input.n_ename_o, input.n_cname, 30, 14, 14, 12) : null;
      const pnW = (pMx ? pMx.bar : 0) + (nMx ? nMx.bar : 0) + 50;
      const cMx = calWidthKorail(tmp, input.kname, input.ename, input.cname, 54, 21, 20, 20, Math.max(pnW, 420));
      const width = calWidth(500, 40, [cMx.bar, pnW]);
      const height = 380;
      
      const canvas = document.createElement("canvas");
      const ctx = initCanvas(canvas, width, height, "rgb(20,50,200)");
      drawKorailBlock(ctx, cMx, 40, 40, input.kname, input.ename, input.cname, 54, 21, 21, 3, true);
      if (pMx) drawKorailBlock(ctx, pMx, 40, 220, input.p_kname, input.p_ename_o, input.p_cname, 30, 14, 14, 2, false);
      if (nMx) drawKorailBlock(ctx, nMx, width-nMx.bar-40, 220, input.n_kname, input.n_ename_o, input.n_cname, 30, 14, 14, 2, false);
      
      drawFilledPolygon(ctx, [[0, 328], [width - 40, 328], [width - 65, 358], [width - 80, 358], [width - 66, 340], [0, 340]], "rgb(240,210,0)");
      
      return canvas;
    }
  }),
  defineStyle({
    id: "seoul",
    label_zh: "首爾地下鐵",
    label_ja: "ソウル地下鉄",
    fields: ["kname", "ename", "cname", "jname", "no", "rgb"],
    fonts: ["Font_SeoulNamsan", "Font_GothicKR_M", "Font_GothicJP_M", "Font_FrutigerBold"],
    render(input) {
      const rgb = hexToRgb(input.rgb || "009944");
      
      const tmp = getMeasureCtx();
      const kW = textWidth(tmp, 44, "Font_SeoulNamsan", input.kname);
      const eW = textWidth(tmp, 22, "Font_FrutigerBold", input.ename);
      const cW = textWidth(tmp, 18, "Font_GothicKR_M", input.cname);
      const jW = input.cname != input.jname ? textWidth(tmp, 18, "Font_GothicJP_M", input.jname) : 0;

      const height = 180;
      const width = 280 + kW + Math.max(eW, cW + jW + 10);
      const circlePos = 120;
      const kPos = 190;

      const fg = fgOnBg(rgb);
      const canvas = document.createElement("canvas");
      const ctx = initCanvas(canvas, width, height);

      drawFilledCircle(ctx, height/2, height/2, height/2-2, input.rgb);
      drawFilledCircle(ctx, width-height/2, height/2, height/2-2, input.rgb);
      drawFilledRect(ctx, height/2, 2, width - height, height-4, input.rgb);
      drawFilledCircle(ctx, height/2, height/2, height/2-25, '#fff');
      drawFilledCircle(ctx, width-height/2, height/2, height/2-25, '#fff');
      drawFilledRect(ctx, height/2, 25, width - height, height-50, '#fff');
      drawFilledCircle(ctx, circlePos, height/2, height/4, input.rgb);
      
      drawText(ctx, { size: 32, family: "Font_FrutigerBold", text: input.no, x: circlePos, y: height/2-15, align: "center", color: fg});
      drawText(ctx, { size: 44, family: "Font_SeoulNamsan", text: input.kname, x: kPos, y: 60, align: "left", color: "#000"});
      drawText(ctx, { size: 22, family: "Font_FrutigerBold", text: input.ename, x: kPos + kW + 20, y: 63, align: "left", color: "#000"});
      drawText(ctx, { size: 18, family: "Font_GothicKR_M", text: input.cname, x: kPos + kW + 20, y: 94, align: "left", color: "#000"});
      if (jW) drawText(ctx, { size: 18, family: "Font_GothicJP_M", text: input.jname, x: kPos + kW + cW + 30, y: 94, align: "left", color: "#000" });

      return canvas;
    }
  }),
  defineStyle({
    id: "busan",
    label_zh: "釜山地下鐵",
    label_ja: "釜山地下鉄",
    fields: ["kname", "ename", "cname", "no", "rgb", "p_kname", "p_ename", "p_cname", "p_jname", "n_kname", "n_ename", "n_cname", "n_jname"],
    fonts: ["Font_Jihacheol", "Font_GothicKR_M", "Font_GothicJP_M", "Font_HelveticaBold", "Font_CondensedDigit"],
    render(input) {
      const rgb = hexToRgb(input.rgb || "009944");
      
      const tmp = getMeasureCtx();
      const kW = textWidth(tmp, 44, "Font_Jihacheol", input.kname);
      const eW = textWidth(tmp, 24, "Font_HelveticaBold", input.ename);
      const cW = textWidth(tmp, 24, "Font_GothicKR_M", input.cname);
      const pW = input.p_kname || input.p_ename || input.p_cname ? Math.max(
        textWidth(tmp, 26, "Font_Jihacheol", input.p_kname),
        textWidth(tmp, 14, ["Font_HelveticaBold", "Font_GothicKR_M"], input.p_ename + ' ' + input.p_cname),
      ) : 0;
      const nW = input.n_kname || input.n_ename || input.n_cname ? Math.max(
        textWidth(tmp, 26, "Font_Jihacheol", input.n_kname),
        textWidth(tmp, 14, ["Font_HelveticaBold", "Font_GothicKR_M"], input.n_ename + ' ' + input.n_cname),
      ) : 0;
      const fg = fgOnBg(rgb);

      const height = 360;
      const circleW = height;
      const barSize = 40;
      const width = circleW + pW + nW + barSize * 2 + 30;
      const offx = barSize + 15 + nW;
      const nPos = barSize + nW / 2 + 15;
      const pPos = width - pW / 2 - barSize - 15;
      
      const canvas = document.createElement("canvas");
      const ctx = initCanvas(canvas, width, height);

      if (nW) drawFilledPolygon(ctx, [[0, height/2], [barSize, height/2-barSize], [width/2, height/2-barSize], [width/2, height/2+barSize], [barSize, height/2+barSize]], input.rgb);
      if (pW) drawFilledPolygon(ctx, [[width/2, height/2-barSize], [width, height/2-barSize], [width-barSize, height/2], [width, height/2+barSize], [width/2, height/2+barSize]], input.rgb);
      drawFilledCircle(ctx, offx + circleW / 2, height / 2, circleW / 2 - 2, input.rgb);
      drawFilledCircle(ctx, offx + circleW / 2, height / 2, circleW / 2 - 38, "#fff");
      drawFilledCircle(ctx, offx + circleW / 2, 95, 35, input.rgb);

      drawText(ctx, { size: 44, family: "Font_Jihacheol", text: input.kname, x: offx + circleW / 2, y: 140, align: "center", color: "#000",
          maxWidth: circleW - 120, measuredWidth: kW
       });
      drawText(ctx, { size: 24, family: "Font_CondensedDigit", text: input.no, x: offx + circleW / 2, y: 82, align: "center", color: "#fff"});
      drawText(ctx, { size: 24, family: "Font_HelveticaBold", text: input.ename, x: offx + circleW / 2, y: 204, align: "center", color: "#000",
          maxWidth: circleW - 130, measuredWidth: eW
       });
      drawText(ctx, { size: 24, family: "Font_GothicKR_M", text: input.cname, x: offx + circleW / 2, y: 244, align: "center", color: "#000",
          maxWidth: circleW - 180, measuredWidth: cW
       });

      drawText(ctx, { size: 26, family: "Font_Jihacheol", text: input.n_kname, x: nPos, y: 150, align: "center", color: fg});
      drawText(ctx, { size: 14, family: ["Font_HelveticaBold", "Font_GothicKR_M"], text: input.n_ename + ' ' + input.n_cname, x: nPos, y: 188, align: "center", color: fg });
      drawText(ctx, { size: 26, family: "Font_Jihacheol", text: input.p_kname, x: pPos, y: 150, align: "center", color: fg});
      drawText(ctx, { size: 14, family: ["Font_HelveticaBold", "Font_GothicKR_M"], text: input.p_ename + ' ' + input.p_cname, x: pPos, y: 188, align: "center", color: fg });

      return canvas;
    }
  }),
  defineStyle({
    id: "sgmrt",
    label_zh: "新加坡地鐵",
    label_ja: "シンガポールMRT",
    fields: ["cname", "ename", "no", "rgb"],
    fonts: ["Font_GothicCN_R", "Font_LTAIdentity"],
    render(input) {
      const tmp = getMeasureCtx();
      const cW = textWidth(tmp, 46, "Font_GothicCN_R", input.cname);
      const eW = textWidth(tmp, 42, "Font_LTAIdentity", input.ename);
      const noW = textWidth(tmp, 36, "Font_LTAIdentity", input.no);

      const width = calWidth(400, 40, [noW + cW + 160, noW + eW + 160]);
      const height = 200;
      
      const canvas = document.createElement("canvas");
      const ctx = initCanvas(canvas, width, height, '#dcdee0');

      const fg = fgOnBg(hexToRgb(input.rgb || "009944"));
      if (noW) {
        drawFilledRect(ctx, 40, 60, noW + 60, 80, input.rgb);
        drawText(ctx, { size: 36, family: "Font_LTAIdentity", text: input.no, x: 70, y: 80, align: "left", color: fg });
      }
      drawText(ctx, { size: 46, family: "Font_LTAIdentity", text: input.ename, x: 140 + noW, y: 36, align: "left", color: "#000" });
      drawText(ctx, { size: 42, family: "Font_GothicCN_R", text: input.cname, x: 140 + noW, y: 114, align: "left", color: "#000" });

      return canvas;
    }
  }),
  defineStyle({
    id: "shanghai",
    label_zh: "上海地鐵",
    label_ja: "上海地下鉄",
    fields: ["cname", "ename", "n_cname", "n_ename", "rgb"],
    fonts: ["Font_GothicCN_R", "Font_HelveticaBold"],
    render(input) {
      const rgb = hexToRgb(input.rgb || "e4002b");
      
      const tmp = getMeasureCtx();
      const hasNext = input.n_cname || input.n_ename;
      const tagW = hasNext ? Math.max(textWidth(tmp, 22, "Font_GothicCN_R", "下一站"), textWidth(tmp, 14, "Font_HelveticaBold", "Next stop")) : 0;
      const nW = hasNext ? Math.max(textWidth(tmp, 32, "Font_GothicCN_R", input.n_cname), textWidth(tmp, 14, "Font_HelveticaBold", input.n_ename)) : 0;
      const mW = Math.max(textWidth(tmp, 40, "Font_GothicCN_R", input.cname), textWidth(tmp, 18, "Font_HelveticaBold", input.ename));
      const width = calWidth(400, 30, [ tagW + nW + mW + 100 ]);
      const height = 200;
      
      const canvas = document.createElement("canvas");
      const ctx = initCanvas(canvas, width, height, "#fff");
      
      const lineColor = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
      ctx.fillStyle = lineColor;
      ctx.fillRect(0, 150, width, 30);
      
      const mPos = width - 30 - mW / 2;
      const nPos = 50 + tagW + nW / 2;
      const tagPos = 30 + tagW / 2;
      const zPos = Math.ceil((nPos + tagPos) / 2);
      
      for (let i = -1; i < 3; i++) {
        drawFilledPolygon(ctx, [[mPos-4+20*i, 150], [mPos+20*i, 150], [mPos-15+20*i, 165], [mPos+20*i, 180], [mPos-4+20*i, 180], [mPos-19+20*i, 165]], "#fff");
        if (hasNext) drawFilledPolygon(ctx, [[zPos-4+20*i, 150], [zPos+20*i, 150], [zPos-15+20*i, 165], [zPos+20*i, 180], [zPos-4+20*i, 180], [zPos-19+20*i, 165]], "#fff");
      }
      
      if (hasNext) {
        drawText(ctx, { size: 22, family: "Font_GothicCN_R", text: "下一站", x: tagPos, y: 75, align: "center", color: "#000" });
        drawText(ctx, { size: 14, family: "Font_HelveticaBold", text: "Next stop", x: tagPos, y: 110, align: "center", color: "#000" });
        drawText(ctx, { size: 32, family: "Font_GothicCN_R", text: input.n_cname, x: nPos, y: 65, align: "center", color: "#000" });
        drawText(ctx, { size: 14, family: "Font_HelveticaBold", text: input.n_ename, x: nPos, y: 110, align: "center", color: "#000" });
      }
      
      drawText(ctx, { size: 40, family: "Font_GothicCN_R", text: input.cname, x: mPos, y: 50, align: "center", color: "rgb(240,30,0)" });
      drawText(ctx, { size: 18, family: "Font_HelveticaBold", text: input.ename, x: mPos, y: 105, align: "center", color: "rgb(240,30,0)" });
      
      return canvas;
    }
  }),
  defineStyle({
    id: "beijing",
    label_zh: "北京地鐵",
    label_ja: "北京地下鉄",
    fields: ["cname", "ename", "no", "p_cname", "p_ename", "n_cname", "n_ename", "rgb"],
    fonts: ["Font_GothicCN_R", "Font_Helvetica"],
    render(input) {
      const rgb = hexToRgb(input.rgb || "004d9b");
      
      const tmp = getMeasureCtx();
      const mWidth = Math.max(
        textWidth(tmp, 36, "Font_GothicCN_R", input.cname),
        textWidth(tmp, 16, "Font_HelveticaBold", input.ename_U),
        0
      );
      const pWidth = Math.max(
        textWidth(tmp, 24, "Font_GothicCN_R", input.p_cname),
        textWidth(tmp, 8, "Font_HelveticaBold", input.p_ename_U),
        0
      );
      const nWidth = Math.max(
        textWidth(tmp, 24, "Font_GothicCN_R", input.n_cname),
        textWidth(tmp, 8, "Font_HelveticaBold", input.n_ename_U),
        0
      );
      const width = calWidth(600, 20, [mWidth + 240 + nWidth + pWidth]);
      const height = 200;
      
      const canvas = document.createElement("canvas");
      const ctx = initCanvas(canvas, width, height, "#fafafa");
      
      const lineColor = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
      const fg = fgOnBg(rgb);
      const pPos = width - 20 - pWidth / 2;
      const nPos = 70 + nWidth / 2;
      const mPos = width - pWidth - 140 - mWidth / 2;
      
      ctx.fillStyle = lineColor;
      ctx.fillRect(0, 50, width, 80);
      
      drawFilledPolygon(ctx, [
        [mPos - 60, 50], [mPos - 10, 0], [mPos + 110, 0], [mPos + 60, 50]
      ], lineColor);
      
      drawFilledPolygon(ctx, [
        [mPos - 60, 130], [mPos + 10, 200], [mPos + 130, 200], [mPos + 60, 130]
      ], lineColor);
      
      ctx.fillStyle = "#fafafa";
      ctx.fillRect(mPos - 60, 10, 160, 4);
      ctx.fillRect(mPos - 60, 165, 190, 3);
      ctx.fillRect(mPos - 60, 175, 190, 3);
      ctx.fillRect(mPos - 60, 184, 190, 2);
      ctx.fillRect(mPos - 60, 192, 190, 1);
      
      if (input.n_cname) {
        drawFilledPolygon(ctx, [
          [20, 90], [35, 75], [47, 75], [37, 85], [65, 85],
          [65, 95], [37, 95], [47, 105], [35, 105]
        ], fg);
      }
      
      drawText(ctx, { size: 36, family: "Font_GothicCN_R", text: input.cname, x: mPos, y: 53, align: "center", color: fg });
      drawText(ctx, { size: 16, family: "Font_HelveticaBold", text: input.ename_U, x: mPos, y: 105, align: "center", color: fg });
      if (input.no) {
        drawText(ctx, { size: 14, family: "Font_HelveticaBold", text: `(${input.no})`, x: mPos + 5, y: 24, align: "center", color: fg });
      }
      
      drawText(ctx, { size: 24, family: "Font_GothicCN_R", text: input.p_cname, x: pPos, y: 68, align: "center", color: fg });
      drawText(ctx, { size: 8, family: "Font_HelveticaBold", text: input.p_ename_U, x: pPos, y: 104, align: "center", color: fg });
      
      drawText(ctx, { size: 24, family: "Font_GothicCN_R", text: input.n_cname, x: nPos, y: 68, align: "center", color: fg });
      drawText(ctx, { size: 8, family: "Font_HelveticaBold", text: input.n_ename_U, x: nPos, y: 104, align: "center", color: fg });
      
      return canvas;
    }
  }),
  defineStyle({
    id: "london",
    label_zh: "倫敦地鐵",
    label_ja: "ロンドン地下鉄",
    fields: ["ename"],
    fonts: ["Font_Johnston"],
    render(input) {
      const tmp = getMeasureCtx();
      const ewidth = textWidth(tmp, 32, "Font_Johnston", input.ename_U);
      const width = calWidth(380, 70, [ewidth], 10);
      const height = 300;
      
      const canvas = document.createElement("canvas");
      const ctx = initCanvas(canvas, width, height, "#fff");
      
      drawFilledCircle(ctx, width / 2, 150, 143, "#000");
      drawFilledCircle(ctx, width / 2, 150, 140, "rgb(157,33,25)");
      drawFilledCircle(ctx, width / 2, 150, 95, "#fff");
      drawFilledRect(ctx, 20, 125, width - 40, 50, "rgb(19,27,74)");
      
      drawText(ctx, { size: 32, family: "Font_Johnston", text: input.ename_U, x: width / 2, y: 133, align: "center", color: "#fff" });
      
      return canvas;
    }
  })
];

export const STYLE_ROSTER = STYLES.map(({ id, label_zh, label_ja, fields, fonts }) => ({ id, label_zh, label_ja, fields, fonts }));

export const RENDERERS = Object.fromEntries(STYLES.map((style) => [style.id, style.render]));
