// Source of truth for the poster editor. Copied directly to dist/app.js for browser use.
const { useMemo, useRef, useState, useEffect, useCallback } = React;

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getInitials(name) {
  if (!name) return "LOGO";
  const clean = name.trim();
  if (!clean) return "LOGO";
  if (clean.includes(" ")) {
    const [first, second] = clean.split(/\s+/);
    return ((first?.[0] || "") + (second?.[0] || "")).toUpperCase() || clean.slice(0, 2).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function fingerprintImage(dataUrl) {
  if (!dataUrl) return "";
  const start = dataUrl.slice(0, 32);
  const end = dataUrl.slice(-32);
  return `${dataUrl.length}:${start}:${end}`;
}

function formatDateTime(timestamp) {
  if (!timestamp) return "";
  try {
    return new Date(timestamp).toLocaleString("zh-CN", { hour12: false });
  } catch (error) {
    console.error("格式化时间失败", error);
    return "";
  }
}

const FEATURE_LAYOUT_MAP = {
  3: [
    { top: "24%", left: "64%", direction: "left", lineLength: 160 },
    { top: "48%", left: "36%", direction: "right", lineLength: 170 },
    { top: "72%", left: "62%", direction: "left", lineLength: 170 },
  ],
  4: [
    { top: "22%", left: "66%", direction: "left", lineLength: 160 },
    { top: "38%", left: "34%", direction: "right", lineLength: 170 },
    { top: "60%", left: "64%", direction: "left", lineLength: 170 },
    { top: "78%", left: "36%", direction: "right", lineLength: 170 },
  ],
};

function SectionTitle({ children }) {
  return React.createElement(
    "div",
    { className: "text-xs font-semibold uppercase tracking-[0.32em] text-gray-500" },
    children,
  );
}

function StepBadge({ number, label }) {
  return React.createElement(
    "div",
    {
      className:
        "inline-flex items-center gap-2 rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-white",
    },
    React.createElement("span", null, String(number).padStart(2, "0")),
    label ? React.createElement("span", { className: "tracking-[0.18em] text-[10px]" }, label) : null,
  );
}

function AssetImageCard({ title, subtitle, image, placeholder }) {
  return React.createElement(
    "div",
    { className: "rounded-xl border border-gray-200 bg-gray-50/60 p-3" },
    React.createElement(
      "div",
      { className: "text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-500" },
      title,
    ),
    React.createElement(
      "div",
      {
        className:
          "mt-3 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-white",
      },
      image
        ? React.createElement("img", {
            src: image,
            alt: title,
            className: "h-full w-full object-cover",
          })
        : React.createElement(
            "span",
            { className: "text-[11px] font-medium text-gray-400" },
            placeholder || "尚未上传",
          ),
    ),
    subtitle
      ? React.createElement(
          "div",
          { className: "mt-2 text-xs font-medium text-gray-600" },
          subtitle,
        )
      : null,
  );
}

function FeatureCallout({ index, text, layout }) {
  const lineStyle = {
    position: "absolute",
    top: "50%",
    width: `${layout.lineLength}px`,
    borderTop: "1px dashed rgba(17, 17, 17, 0.72)",
    transform: "translateY(-50%)",
  };
  const labelStyle = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
  };

  if (layout.direction === "left") {
    lineStyle.right = "calc(100% + 8px)";
    labelStyle.right = `calc(100% + ${layout.lineLength + 26}px)`;
  } else {
    lineStyle.left = "calc(100% + 8px)";
    labelStyle.left = `calc(100% + ${layout.lineLength + 26}px)`;
  }

  return React.createElement(
    "div",
    { className: "pointer-events-none absolute", style: { top: layout.top, left: layout.left } },
    React.createElement(
      "div",
      { className: "relative" },
      React.createElement("div", {
        className:
          "h-3.5 w-3.5 rounded-full border-[3px] border-accent bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.95)]",
      }),
      React.createElement("div", { style: lineStyle }),
      React.createElement(
        "div",
        { style: labelStyle },
        React.createElement(
          "div",
          {
            className:
              "inline-flex max-w-xs items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-900 shadow-[0_10px_30px_rgba(15,23,42,0.08)]",
          },
          React.createElement(
            "span",
            { className: "text-sm font-black text-accent" },
            String(index + 1).padStart(2, "0"),
          ),
          React.createElement(
            "span",
            { className: "text-[13px] leading-tight text-gray-800" },
            text || `功能亮点 ${index + 1}`,
          ),
        ),
      ),
    ),
  );
}

const PosterPreview = React.forwardRef(function PosterPreview(props, ref) {
  const {
    brandName,
    brandLogo,
    agentName,
    headline,
    tagline,
    taglineAlign,
    scenarioImage,
    productName,
    productImage,
    features,
    seriesDescription,
    shots,
  } = props;

  const featureCount = Math.min(Math.max(features.length, 3), 4);
  const layouts = FEATURE_LAYOUT_MAP[featureCount] || FEATURE_LAYOUT_MAP[4];
  const visibleFeatures = features.slice(0, layouts.length);
  const visibleShots = shots.slice(0, 4);
  const shotColumns = visibleShots.length || 3;

  return React.createElement(
    "div",
    {
      ref,
      className:
        "relative mx-auto flex h-[1400px] w-[900px] select-none flex-col overflow-hidden rounded-[36px] border border-gray-200 bg-white shadow-[0_40px_90px_rgba(15,23,42,0.14)]",
    },
    React.createElement(
      "div",
      { className: "px-16 pt-14" },
      React.createElement(
        "div",
        { className: "flex items-center justify-between" },
        React.createElement(
          "div",
          { className: "flex items-center gap-6" },
          React.createElement(
            "div",
            {
              className:
                "flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-accent bg-white shadow-md",
            },
            brandLogo
              ? React.createElement("img", {
                  src: brandLogo,
                  alt: "品牌 Logo",
                  className: "h-full w-full object-contain",
                })
              : React.createElement(
                  "span",
                  { className: "text-lg font-black tracking-[0.3em] text-accent" },
                  getInitials(brandName),
                ),
          ),
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              { className: "text-[30px] font-black tracking-[0.18em] text-gray-900" },
              brandName || "品牌名称 / LOGO",
            ),
            React.createElement("div", { className: "mt-2 h-1 w-12 rounded-full bg-accent" }),
          ),
        ),
        React.createElement(
          "div",
          { className: "text-right text-[11px] font-semibold uppercase tracking-[0.5em] text-gray-500" },
          agentName || "代理名 / 分销名",
        ),
      ),
    ),
    React.createElement(
      "div",
      { className: "px-16 pt-10" },
      React.createElement(
        "div",
        { className: "text-center text-[48px] font-black tracking-[0.16em] text-accent" },
        headline || "标题文案",
      ),
    ),
    React.createElement(
      "div",
      { className: "flex-1 px-16 pt-10" },
      React.createElement(
        "div",
        { className: "grid h-full grid-cols-[0.4fr,0.6fr] gap-10" },
        React.createElement(
          "div",
          { className: "relative overflow-hidden rounded-[30px] border border-gray-200 bg-gray-100 shadow-inner" },
          scenarioImage
            ? React.createElement("img", {
                src: scenarioImage,
                alt: "应用场景图",
                className: "h-full w-full object-cover",
              })
            : React.createElement(
                "div",
                {
                  className:
                    "flex h-full items-center justify-center text-center text-sm uppercase tracking-[0.4em] text-gray-400",
                },
                "应用场景图",
              ),
          React.createElement(
            "div",
            {
              className:
                "absolute left-6 top-6 rounded-full bg-white/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.4em] text-gray-700",
            },
            "SCENE",
          ),
        ),
        React.createElement(
          "div",
          { className: "flex flex-col" },
          React.createElement(
            "div",
            { className: "text-[30px] font-extrabold tracking-[0.14em] text-gray-900" },
            productName || "主产品名称",
          ),
          React.createElement(
            "div",
            {
              className:
                "relative mt-6 flex-1 rounded-[30px] border border-gray-200 bg-gradient-to-br from-gray-50 via-white to-gray-100 shadow-inner",
            },
            productImage
              ? React.createElement("img", {
                  src: productImage,
                  alt: "主产品图",
                  className:
                    "absolute left-1/2 top-1/2 h-[82%] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_28px_60px_rgba(15,23,42,0.25)]",
                })
              : React.createElement(
                  "div",
                  {
                    className:
                      "absolute left-1/2 top-1/2 flex w-[70%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[24px] border-2 border-dashed border-gray-300 bg-white/70 p-6 text-center text-sm uppercase tracking-[0.3em] text-gray-400",
                  },
                  "上传 45° 主产品图",
                ),
            React.createElement(
              "div",
              { className: "absolute inset-0" },
              visibleFeatures.map((feature, index) =>
                React.createElement(FeatureCallout, {
                  key: feature.id,
                  index,
                  text: feature.text,
                  layout: layouts[index],
                }),
              ),
            ),
          ),
        ),
      ),
    ),
    React.createElement(
      "div",
      { className: "px-16 pb-16 pt-12" },
      React.createElement(
        "div",
        { className: "text-center text-xs font-semibold uppercase tracking-[0.45em] text-gray-500" },
        seriesDescription || "三视图 / 系列说明",
      ),
      React.createElement(
        "div",
        {
          className: "mt-6 grid gap-6",
          style: { gridTemplateColumns: `repeat(${shotColumns}, minmax(0, 1fr))` },
        },
        visibleShots.map((shot, index) =>
          React.createElement(
            "div",
            {
              key: shot.id,
              className: "flex flex-col items-center gap-3 rounded-[24px] border border-gray-200 bg-gray-50/80 p-4",
            },
            React.createElement(
              "div",
              { className: "h-28 w-full overflow-hidden rounded-[18px] border border-gray-200 bg-white" },
              shot.img
                ? React.createElement("img", {
                    src: shot.img,
                    alt: shot.label || "小图",
                    className: "h-full w-full object-cover",
                    style: { filter: "grayscale(100%) contrast(115%) brightness(0.95)" },
                  })
                : React.createElement(
                    "div",
                    {
                      className:
                        "flex h-full items-center justify-center text-[11px] uppercase tracking-[0.35em] text-gray-400",
                    },
                    "小图",
                  ),
            ),
            React.createElement(
              "div",
              { className: "text-center text-[11px] font-semibold uppercase tracking-[0.4em] text-gray-600" },
              shot.label || `说明文字`,
            ),
          ),
        ),
      ),
      React.createElement(
        "div",
        {
          className: `mt-10 text-4xl font-black tracking-[0.2em] text-accent ${
            taglineAlign === "left" ? "text-left" : "text-right"
          }`,
        },
        tagline || "副标题文案",
      ),
    ),
  );
});


function AssetPreviewPanel({
  brandLogo,
  brandName,
  agentName,
  headline,
  tagline,
  seriesDescription,
  productName,
  scenarioImage,
  productImage,
  shots,
  features,
  confirmationStatus,
  confirmedAt,
  onConfirm,
  canConfirm,
}) {
  const providedShotCount = shots.filter((shot) => Boolean(shot.img)).length;
  const statusMeta = {
    "needs-review": {
      chipClass: "border-amber-300 bg-amber-50 text-amber-700",
      label: "待确认",
      message: "确认左侧填写的图文素材，下一步将其一并提交给 Glibatree。",
    },
    dirty: {
      chipClass: "border-orange-300 bg-orange-50 text-orange-700",
      label: "需重新确认",
      message: "素材已更新，请重新确认后再调用 Glibatree。",
    },
    confirmed: {
      chipClass: "border-emerald-300 bg-emerald-50 text-emerald-700",
      label: "已确认",
      message: "素材已确认，可继续调用 Glibatree。",
    },
  };
  const status = statusMeta[confirmationStatus] || statusMeta["needs-review"];
  const confirmButtonLabel =
    confirmationStatus === "confirmed"
      ? canConfirm
        ? "重新确认素材"
        : "已确认"
      : "确认素材无误";
  const confirmButtonClass = canConfirm
    ? "inline-flex items-center justify-center rounded-lg border border-gray-900 px-3 py-1.5 text-xs font-semibold text-gray-900 transition hover:bg-gray-900 hover:text-white"
    : "inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-400 transition cursor-not-allowed";

  return React.createElement(
    "div",
    { className: "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" },
    React.createElement(
      "div",
      { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" },
      React.createElement(
        "div",
        { className: "flex flex-wrap items-center gap-3" },
        React.createElement(StepBadge, { number: 1, label: "素材确认" }),
        React.createElement(
          "span",
          {
            className: `inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${status.chipClass}`,
          },
          status.label,
        ),
        confirmedAt
          ? React.createElement(
              "span",
              { className: "text-[11px] text-gray-400" },
              `上次确认：${formatDateTime(confirmedAt)}`,
            )
          : null,
      ),
      React.createElement(
        "div",
        { className: "flex flex-col items-start gap-2 text-xs text-gray-500 sm:items-end sm:text-right" },
        React.createElement("span", null, status.message),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: onConfirm,
            disabled: !canConfirm,
            className: confirmButtonClass,
          },
          confirmButtonLabel,
        ),
      ),
    ),
    React.createElement(
      "div",
      { className: "mt-4 grid gap-4" },
      React.createElement(
        "div",
        { className: "rounded-xl border border-gray-200 bg-gray-50/60 p-3" },
        React.createElement(
          "div",
          { className: "text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-500" },
          "品牌信息",
        ),
        React.createElement(
          "div",
          { className: "mt-3 flex items-center gap-4" },
          React.createElement(
            "div",
            {
              className:
                "flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-dashed border-gray-300 bg-white",
            },
            brandLogo
              ? React.createElement("img", {
                  src: brandLogo,
                  alt: "品牌 Logo",
                  className: "h-full w-full object-contain",
                })
              : React.createElement(
                  "span",
                  { className: "text-xs font-black tracking-[0.3em] text-accent" },
                  getInitials(brandName),
                ),
          ),
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              { className: "text-sm font-semibold text-gray-900" },
              brandName || "品牌名称 / LOGO",
            ),
            React.createElement(
              "div",
              { className: "text-xs text-gray-500" },
              agentName || "代理名 / 分销名",
            ),
          ),
        ),
      ),
      React.createElement(
        "div",
        { className: "grid gap-4 sm:grid-cols-2" },
        React.createElement(AssetImageCard, {
          title: "应用场景图",
          image: scenarioImage,
          placeholder: "尚未上传场景素材",
        }),
        React.createElement(AssetImageCard, {
          title: "主产品图",
          image: productImage,
          placeholder: "尚未上传主产品图",
          subtitle: productName || "主产品名称",
        }),
      ),
      React.createElement(
        "div",
        { className: "rounded-xl border border-gray-200 bg-gray-50/60 p-3" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between" },
          React.createElement(
            "div",
            { className: "text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-500" },
            "底部小图",
          ),
          React.createElement(
            "div",
            { className: "text-[11px] font-medium text-gray-400" },
            `${providedShotCount}/${shots.length} 已上传`,
          ),
        ),
        React.createElement(
          "div",
          { className: "mt-3 grid gap-3 sm:grid-cols-3" },
          shots.map((shot, index) =>
            React.createElement(
              "div",
              {
                key: shot.id,
                className: "rounded-lg border border-gray-200 bg-white p-2",
              },
              React.createElement(
                "div",
                {
                  className:
                    "flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50",
                },
                shot.img
                  ? React.createElement("img", {
                      src: shot.img,
                      alt: shot.label || `小图 ${index + 1}`,
                      className: "h-full w-full object-cover",
                      style: { filter: "grayscale(100%) contrast(115%) brightness(0.95)" },
                    })
                  : React.createElement(
                      "span",
                      { className: "text-[11px] text-gray-400" },
                      "未上传",
                    ),
              ),
              React.createElement(
                "div",
                { className: "mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.4em] text-gray-600" },
                shot.label || `小图 ${index + 1}`,
              ),
            ),
          ),
        ),
      ),
      React.createElement(
        "div",
        { className: "rounded-xl border border-gray-200 bg-gray-50/60 p-3" },
        React.createElement(
          "div",
          { className: "text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-500" },
          "文案速览",
        ),
        React.createElement(
          "dl",
          { className: "mt-3 grid gap-2 text-sm text-gray-600" },
          React.createElement(
            "div",
            { className: "flex items-baseline gap-2" },
            React.createElement("dt", { className: "text-xs font-semibold uppercase tracking-[0.35em] text-gray-400" }, "标题"),
            React.createElement("dd", { className: "font-medium text-gray-700" }, headline || "标题文案"),
          ),
          React.createElement(
            "div",
            { className: "flex items-baseline gap-2" },
            React.createElement("dt", { className: "text-xs font-semibold uppercase tracking-[0.35em] text-gray-400" }, "副标题"),
            React.createElement("dd", { className: "font-medium text-gray-700" }, tagline || "副标题文案"),
          ),
          React.createElement(
            "div",
            { className: "flex items-baseline gap-2" },
            React.createElement("dt", { className: "text-xs font-semibold uppercase tracking-[0.35em] text-gray-400" }, "系列说明"),
            React.createElement(
              "dd",
              { className: "font-medium text-gray-700" },
              seriesDescription || "三视图 / 系列说明",
            ),
          ),
        ),
        React.createElement(
          "ul",
          { className: "mt-3 space-y-2" },
          features.map((feature, index) =>
            React.createElement(
              "li",
              { key: feature.id, className: "flex items-start gap-3 rounded-lg bg-white px-3 py-2 shadow-sm" },
              React.createElement(
                "span",
                {
                  className:
                    "mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white",
                },
                String(index + 1).padStart(2, "0"),
              ),
              React.createElement(
                "span",
                { className: "text-sm font-medium text-gray-700" },
                feature.text?.trim() || `功能点 ${index + 1}`,
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

function App() {
  const [brandName, setBrandName] = useState("KITCHEN PRO");
  const [brandLogo, setBrandLogo] = useState("");
  const [agentName, setAgentName] = useState("旗舰渠道 · 全国分销");
  const [headline, setHeadline] = useState("新一代厨房电器解决方案");
  const [tagline, setTagline] = useState("智造好厨房");
  const [taglineAlign, setTaglineAlign] = useState("right");
  const [scenarioImage, setScenarioImage] = useState("");
  const [productName, setProductName] = useState("多功能破壁料理机");
  const [productImage, setProductImage] = useState("");
  const [features, setFeatures] = useState([
    { id: uuid(), text: "智能控温 精准锁鲜" },
    { id: uuid(), text: "一键清洗 轻松省时" },
    { id: uuid(), text: "多段变速 精细研磨" },
    { id: uuid(), text: "静音降噪 舒适体验" },
  ]);
  const [seriesDescription, setSeriesDescription] = useState("三视图 / 系列款式展示");
  const [shots, setShots] = useState([
    { id: uuid(), label: "正面视图", img: "" },
    { id: uuid(), label: "侧面视图", img: "" },
    { id: uuid(), label: "细节特写", img: "" },
  ]);
  const [glibatreeEndpoint, setGlibatreeEndpoint] = useState(
    "https://designer.glibatree.com/api/v1/design",
  );
  const [glibatreeApiKey, setGlibatreeApiKey] = useState("");
  const [designerStatus, setDesignerStatus] = useState("idle");
  const [designerMessage, setDesignerMessage] = useState("");
  const [designerResult, setDesignerResult] = useState(null);
  const [copyState, setCopyState] = useState("idle");

  const assetSignature = useMemo(
    () =>
      JSON.stringify({
        brandName,
        brandLogo: fingerprintImage(brandLogo),
        agentName,
        headline,
        tagline,
        taglineAlign,
        scenarioImage: fingerprintImage(scenarioImage),
        productName,
        productImage: fingerprintImage(productImage),
        seriesDescription,
        features: features.map((feature) => ({ id: feature.id, text: feature.text })),
        shots: shots.map((shot) => ({ id: shot.id, label: shot.label, fingerprint: fingerprintImage(shot.img) })),
      }),
    [
      agentName,
      brandLogo,
      brandName,
      features,
      headline,
      productImage,
      productName,
      scenarioImage,
      seriesDescription,
      shots,
      tagline,
      taglineAlign,
    ],
  );

  const [assetConfirmation, setAssetConfirmation] = useState({
    status: "needs-review",
    signature: "",
    confirmedAt: null,
  });

  const isAssetsConfirmed =
    assetConfirmation.status === "confirmed" && assetConfirmation.signature === assetSignature;
  const canConfirmAssets =
    assetConfirmation.status !== "confirmed" || assetConfirmation.signature !== assetSignature;

  useEffect(() => {
    setAssetConfirmation((prev) => {
      if (prev.status === "confirmed" && prev.signature !== assetSignature) {
        return { ...prev, status: "dirty" };
      }
      return prev;
    });
  }, [assetSignature]);

  useEffect(() => {
    if (assetConfirmation.status === "dirty" && designerStatus !== "loading") {
      const message = "素材内容有更新，请重新确认后再调用 Glibatree。";
      setDesignerMessage((prev) => (prev === message ? prev : message));
      if (designerStatus !== "idle") {
        setDesignerStatus("idle");
      }
      setDesignerResult(null);
    }
  }, [assetConfirmation.status, designerStatus]);

  const confirmAssets = useCallback(() => {
    setAssetConfirmation({ status: "confirmed", signature: assetSignature, confirmedAt: Date.now() });
  }, [assetSignature]);

  const posterRef = useRef(null);

  const glibatreePrompt = useMemo(() => {
    const featureTexts = features.map((feature, index) => {
      const text = (feature.text || "").trim() || `功能点 ${index + 1}`;
      return `${index + 1}. ${text}`;
    });
    const shotLines = shots.map((shot, index) => {
      const label = (shot.label || "").trim() || `小图 ${index + 1}`;
      const suffix = shot.img
        ? "（已提供素材，请转换为灰度并保持统一风格）"
        : "（无素材，请设计灰度/黑白小图）";
      return `${index + 1}. ${label}${suffix}`;
    });
    const lines = [
      "使用 Glibatree Art Designer 绘制现代简洁风厨房电器宣传海报。",
      isAssetsConfirmed
        ? "以下素材已由品牌方确认无误，请严格按照对应内容进行排版与设计。"
        : "素材仍在完善中，请以最新文本说明为准，保持整体风格一致。",
      "画布尺寸 900x1400 像素，背景为浅灰或白色，整体主色为黑/红/灰银，留白充足、排版规整。",
      "版式结构：",
      "1. 顶部横条：左侧放品牌 Logo，右侧放代理名或分销名。",
      brandLogo
        ? "   Logo 素材：已上传，请在左上角以原始比例放置。"
        : `   Logo 文案呈现：${brandName || "品牌名称 / LOGO"}.`,
      `   品牌名：${brandName || "品牌名称 / LOGO"}；代理/分销：${agentName || "代理名 / 分销名"}.`,
      "2. 左侧约 40% 宽度放应用场景图。",
      scenarioImage
        ? "   应用场景素材：已上传，请与左侧区域对齐。"
        : "   若无素材，请绘制与厨房使用相关的应用场景，光线柔和。",
      "3. 右侧为视觉中心，摆放主产品 45° 渲染图，背景浅灰或白色，金属/塑料质感清晰。",
      productImage
        ? `   使用上传的主产品素材，产品名称：${productName || "主产品名称"}.`
        : `   产品名称：${productName || "主产品名称"}，需呈现高端金属与塑料质感。`,
      featureTexts.length
        ? "   在产品四周添加 3–4 条功能点标注（虚线连接小号黑色文字气泡）："
        : "   请在产品四周添加 3–4 条功能点标注（虚线+小号黑色文字气泡）。",
      ...featureTexts.map((text) => `   ${text}`),
      "   标注编号从 01 开始，气泡白底细阴影，文字使用黑色。",
      "4. 中部标题使用大号粗体红字。",
      `   标题文案：${headline || "标题文案"}.`,
      "5. 底部横向排列 3–4 张灰度/黑白的小图，表现三视图或系列款式。",
    ];
    if (shotLines.length) {
      lines.push("   底部小图说明：");
      shotLines.forEach((line) => {
        lines.push(`   ${line}`);
      });
    }
    lines.push("   每张小图之间等距，整体呈现灰度效果。");
    lines.push("6. 左下或右下角放置副标题/标语，使用大号粗体红字。");
    lines.push(
      `   副标题文案：${tagline || "副标题文案"}，对齐方式：${
        taglineAlign === "left" ? "左对齐" : "右对齐"
      }。`,
    );
    lines.push("额外要求：功能说明文字保持黑色，标题与副标题使用明亮红色，突出产品质感与品牌调性。");
    if (seriesDescription) {
      lines.push(`底部说明文案：${seriesDescription}.`);
    }
    return lines.join("\n");
  }, [
    agentName,
    assetSignature,
    assetConfirmation.status,
    brandLogo,
    brandName,
    features,
    headline,
    productImage,
    productName,
    scenarioImage,
    seriesDescription,
    shots,
    tagline,
    taglineAlign,
    isAssetsConfirmed,
  ]);

  const handleCopyPrompt = async () => {
    if (!glibatreePrompt.trim()) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(glibatreePrompt);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = glibatreePrompt;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopyState("success");
    } catch (error) {
      console.error("复制提示词失败：", error);
      setCopyState("error");
    } finally {
      setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  const callGlibatreeDesigner = async () => {
    if (!isAssetsConfirmed) {
      setDesignerStatus("error");
      setDesignerMessage("请先在“素材确认”中点击“确认素材无误”，并确保素材未再次改动。");
      setDesignerResult(null);
      return;
    }
    if (!glibatreeEndpoint.trim()) {
      setDesignerStatus("error");
      setDesignerMessage("请填写 Glibatree Art Designer 接口地址。");
      return;
    }
    setDesignerStatus("loading");
    setDesignerMessage("正在向 Glibatree Art Designer 提交绘制请求...");
    setDesignerResult(null);
    try {
      const featurePayload = features.map((feature, index) => ({
        id: feature.id,
        order: index + 1,
        text: (feature.text || "").trim(),
      }));
      const shotMetadata = shots.map((shot, index) => ({
        id: shot.id,
        order: index + 1,
        label: (shot.label || "").trim() || `小图 ${index + 1}`,
        hasImage: Boolean(shot.img),
      }));
      const shotAssets = shots
        .filter((shot) => Boolean(shot.img))
        .map((shot, index) => ({
          id: shot.id,
          order: index + 1,
          label: (shot.label || "").trim() || `小图 ${index + 1}`,
          image: shot.img,
        }));

      const payload = {
        prompt: glibatreePrompt,
        canvas: { width: 900, height: 1400 },
        locale: "zh-CN",
        theme: "modern-minimal-kitchen",
        metadata: {
          brandName,
          agentName,
          headline,
          tagline,
          taglineAlign,
          productName,
          seriesDescription,
        },
        features: featurePayload,
        shots: shotMetadata,
        assets: {
          ...(brandLogo ? { brandLogo } : {}),
          ...(scenarioImage ? { scenarioImage } : {}),
          ...(productImage ? { productImage } : {}),
          ...(shotAssets.length ? { shotImages: shotAssets } : {}),
        },
      };

      const headers = {
        "Content-Type": "application/json",
      };
      if (glibatreeApiKey.trim()) {
        headers.Authorization = `Bearer ${glibatreeApiKey.trim()}`;
      }

      const response = await fetch(glibatreeEndpoint.trim(), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`接口返回 ${response.status}: ${errorText || "未知错误"}`);
      }

      const contentType = response.headers.get("content-type") || "";
      let data;
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { raw: text };
      }

      const candidateImages = [];
      if (data?.image) candidateImages.push(data.image);
      if (Array.isArray(data?.images) && data.images.length) candidateImages.push(data.images[0]);
      if (Array.isArray(data?.outputs) && data.outputs.length) candidateImages.push(data.outputs[0]);
      if (data?.url) candidateImages.push(data.url);
      if (data?.result) candidateImages.push(data.result);

      let imageSrc = "";
      const firstCandidate = candidateImages.find(Boolean);
      if (firstCandidate) {
        if (typeof firstCandidate === "string") {
          if (firstCandidate.startsWith("data:") || firstCandidate.startsWith("http")) {
            imageSrc = firstCandidate;
          } else {
            imageSrc = `data:image/png;base64,${firstCandidate}`;
          }
        } else if (typeof firstCandidate === "object") {
          if (firstCandidate.url) {
            imageSrc = firstCandidate.url;
          } else if (firstCandidate.base64) {
            imageSrc = firstCandidate.base64.startsWith("data:")
              ? firstCandidate.base64
              : `data:image/png;base64,${firstCandidate.base64}`;
          }
        }
      }

      const successMessage = imageSrc
        ? "绘制请求已完成，以下为返回结果。"
        : "绘制请求已完成，但返回数据中未包含图像，请查看响应详情。";
      setDesignerStatus("success");
      setDesignerMessage(successMessage);
      setDesignerResult({
        imageSrc,
        data,
      });
    } catch (error) {
      console.error("调用 Glibatree Art Designer 失败：", error);
      setDesignerStatus("error");
      setDesignerMessage(error.message || "调用失败，请稍后重试。");
      setDesignerResult(null);
    }
  };

  const resetDesigner = () => {
    setDesignerStatus("idle");
    setDesignerMessage("");
    setDesignerResult(null);
  };

  const downloadDesignerImage = () => {
    if (!designerResult?.imageSrc) return;
    if (!designerResult.imageSrc.startsWith("data:")) {
      window.open(designerResult.imageSrc, "_blank");
      return;
    }
    const link = document.createElement("a");
    link.href = designerResult.imageSrc;
    link.download = `glibatree-poster-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageUpload = async (event, setter) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    setter(dataUrl);
  };

  const updateFeature = (id, text) => {
    setFeatures((prev) => prev.map((feature) => (feature.id === id ? { ...feature, text } : feature)));
  };

  const addFeature = () => {
    setFeatures((prev) => {
      if (prev.length >= 4) return prev;
      return [...prev, { id: uuid(), text: "" }];
    });
  };

  const removeFeature = (id) => {
    setFeatures((prev) => {
      if (prev.length <= 3) return prev;
      return prev.filter((feature) => feature.id !== id);
    });
  };

  const updateShotLabel = (id, label) => {
    setShots((prev) => prev.map((shot) => (shot.id === id ? { ...shot, label } : shot)));
  };

  const updateShotImage = async (event, id) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    setShots((prev) => prev.map((shot) => (shot.id === id ? { ...shot, img: dataUrl } : shot)));
  };

  const addShot = () => {
    setShots((prev) => {
      if (prev.length >= 4) return prev;
      return [...prev, { id: uuid(), label: "", img: "" }];
    });
  };

  const removeShot = (id) => {
    setShots((prev) => {
      if (prev.length <= 3) return prev;
      return prev.filter((shot) => shot.id !== id);
    });
  };

  const exportPNG = async () => {
    if (!posterRef.current) return;
    const dataUrl = await htmlToImage.toPng(posterRef.current, { pixelRatio: 3 });
    const link = document.createElement("a");
    link.download = `kitchen-poster-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const exportPDF = async () => {
    if (!posterRef.current) return;
    const dataUrl = await htmlToImage.toPng(posterRef.current, { pixelRatio: 3 });
    const image = new Image();
    image.src = dataUrl;
    await new Promise((resolve) => {
      image.onload = resolve;
    });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pageWidth / image.width, pageHeight / image.height);
    const renderWidth = image.width * ratio;
    const renderHeight = image.height * ratio;
    const offsetX = (pageWidth - renderWidth) / 2;
    const offsetY = (pageHeight - renderHeight) / 2;
    pdf.addImage(dataUrl, "PNG", offsetX, offsetY, renderWidth, renderHeight);
    pdf.save(`kitchen-poster-${Date.now()}.pdf`);
  };

  return React.createElement(
    "div",
    { className: "min-h-screen bg-[#f4f4f8] pb-16 text-gray-900" },
    React.createElement(
      "div",
      { className: "mx-auto max-w-7xl px-4 py-10" },
      React.createElement(
        "header",
        { className: "mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between" },
        React.createElement(
          "div",
          null,
          React.createElement(
            "h1",
            { className: "text-2xl font-bold tracking-tight text-gray-900" },
            "厨房电器宣传海报生成器",
          ),
          React.createElement(
            "p",
            { className: "mt-1 text-sm text-gray-500" },
            "按照固定版式填写内容，突出产品功能与卖点，支持导出 PNG / PDF。",
          ),
        ),
        React.createElement(
          "div",
          { className: "flex flex-wrap items-center gap-3" },
          React.createElement(
            "button",
            {
              onClick: exportPNG,
              className:
                "inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-gray-800",
            },
            "导出 PNG",
          ),
          React.createElement(
            "button",
            {
              onClick: exportPDF,
              className:
                "inline-flex items-center justify-center rounded-xl border border-gray-900 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-900 hover:text-white",
            },
            "导出 PDF",
          ),
        ),
      ),
      React.createElement(
        "div",
        { className: "grid gap-6 lg:grid-cols-[380px,1fr]" },
        React.createElement(
          "div",
          { className: "space-y-6" },
          React.createElement(
            "div",
            { className: "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" },
            React.createElement(SectionTitle, null, "顶部信息"),
            React.createElement(
              "div",
              { className: "mt-4 space-y-4" },
              React.createElement(
                "div",
                null,
                React.createElement(
                  "label",
                  { className: "text-sm font-medium text-gray-700" },
                  "品牌名 / Logo 文案",
                ),
                React.createElement("input", {
                  value: brandName,
                  onChange: (event) => setBrandName(event.target.value),
                  className:
                    "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none",
                  placeholder: "如：KITCHEN PRO",
                }),
              ),
              React.createElement(
                "div",
                null,
                React.createElement(
                  "label",
                  { className: "text-sm font-medium text-gray-700" },
                  "上传品牌 Logo（可选）",
                ),
                React.createElement("input", {
                  type: "file",
                  accept: "image/*",
                  onChange: (event) => handleImageUpload(event, setBrandLogo),
                  className: "mt-1 w-full cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm",
                }),
              ),
              React.createElement(
                "div",
                null,
                React.createElement(
                  "label",
                  { className: "text-sm font-medium text-gray-700" },
                  "代理名 / 分销名",
                ),
                React.createElement("input", {
                  value: agentName,
                  onChange: (event) => setAgentName(event.target.value),
                  className:
                    "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none",
                  placeholder: "如：旗舰渠道 · 全国分销",
                }),
              ),
            ),
          ),
          React.createElement(
            "div",
            { className: "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" },
            React.createElement(SectionTitle, null, "标题与标语"),
            React.createElement(
              "div",
              { className: "mt-4 space-y-4" },
              React.createElement(
                "div",
                null,
                React.createElement(
                  "label",
                  { className: "text-sm font-medium text-gray-700" },
                  "标题文案",
                ),
                React.createElement("textarea", {
                  rows: 2,
                  value: headline,
                  onChange: (event) => setHeadline(event.target.value),
                  className:
                    "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none",
                  placeholder: "请填写主标题，建议 10-16 字",
                }),
              ),
              React.createElement(
                "div",
                null,
                React.createElement(
                  "label",
                  { className: "text-sm font-medium text-gray-700" },
                  "副标题 / 标语",
                ),
                React.createElement("input", {
                  value: tagline,
                  onChange: (event) => setTagline(event.target.value),
                  className:
                    "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none",
                  placeholder: "如：智造好厨房",
                }),
              ),
              React.createElement(
                "div",
                null,
                React.createElement(
                  "span",
                  { className: "text-xs font-medium text-gray-500" },
                  "标语位置",
                ),
                React.createElement(
                  "div",
                  { className: "mt-2 flex gap-4 text-sm text-gray-600" },
                  React.createElement(
                    "label",
                    { className: "inline-flex items-center gap-2" },
                    React.createElement("input", {
                      type: "radio",
                      name: "taglineAlign",
                      value: "left",
                      checked: taglineAlign === "left",
                      onChange: () => setTaglineAlign("left"),
                    }),
                    "左下角",
                  ),
                  React.createElement(
                    "label",
                    { className: "inline-flex items-center gap-2" },
                    React.createElement("input", {
                      type: "radio",
                      name: "taglineAlign",
                      value: "right",
                      checked: taglineAlign === "right",
                      onChange: () => setTaglineAlign("right"),
                    }),
                    "右下角",
                  ),
                ),
              ),
            ),
          ),
          React.createElement(
            "div",
            { className: "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" },
            React.createElement(SectionTitle, null, "场景图 & 主产品"),
            React.createElement(
              "div",
              { className: "mt-4 space-y-4" },
              React.createElement(
                "div",
                null,
                React.createElement(
                  "label",
                  { className: "text-sm font-medium text-gray-700" },
                  "左侧应用场景图",
                ),
                React.createElement("input", {
                  type: "file",
                  accept: "image/*",
                  onChange: (event) => handleImageUpload(event, setScenarioImage),
                  className: "mt-1 w-full cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm",
                }),
              ),
              React.createElement(
                "div",
                null,
                React.createElement(
                  "label",
                  { className: "text-sm font-medium text-gray-700" },
                  "主产品名称",
                ),
                React.createElement("input", {
                  value: productName,
                  onChange: (event) => setProductName(event.target.value),
                  className:
                    "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none",
                  placeholder: "如：多功能破壁料理机",
                }),
              ),
              React.createElement(
                "div",
                null,
                React.createElement(
                  "label",
                  { className: "text-sm font-medium text-gray-700" },
                  "主产品 45° 渲染图",
                ),
                React.createElement("input", {
                  type: "file",
                  accept: "image/*",
                  onChange: (event) => handleImageUpload(event, setProductImage),
                  className: "mt-1 w-full cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm",
                }),
              ),
            ),
          ),
          React.createElement(
            "div",
            { className: "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" },
            React.createElement(SectionTitle, null, "功能亮点（3-4 条）"),
            React.createElement(
              "div",
              { className: "mt-4 space-y-3" },
              features.map((feature, index) =>
                React.createElement(
                  "div",
                  { key: feature.id, className: "flex items-center gap-3" },
                  React.createElement(
                    "div",
                    { className: "flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white" },
                    index + 1,
                  ),
                  React.createElement("input", {
                    value: feature.text,
                    onChange: (event) => updateFeature(feature.id, event.target.value),
                    className:
                      "flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none",
                    placeholder: `功能点 ${index + 1}`,
                  }),
                  features.length > 3
                    ? React.createElement(
                        "button",
                        {
                          type: "button",
                          onClick: () => removeFeature(feature.id),
                          className: "text-xs text-gray-500 hover:text-red-500",
                        },
                        "删除",
                      )
                    : null,
                ),
              ),
            ),
            React.createElement(
              "div",
              { className: "mt-3" },
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: addFeature,
                  disabled: features.length >= 4,
                  className:
                    "inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-900 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40",
                },
                "+ 新增功能点",
              ),
            ),
          ),
          React.createElement(
            "div",
            { className: "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" },
            React.createElement(SectionTitle, null, "底部小图（3-4 张）"),
            React.createElement(
              "div",
              { className: "mt-4 space-y-4" },
              React.createElement(
                "div",
                null,
                React.createElement(
                  "label",
                  { className: "text-sm font-medium text-gray-700" },
                  "系列说明 / 三视图标题",
                ),
                React.createElement("input", {
                  value: seriesDescription,
                  onChange: (event) => setSeriesDescription(event.target.value),
                  className:
                    "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none",
                  placeholder: "如：三视图 / 系列款式展示",
                }),
              ),
              React.createElement(
                "div",
                { className: "space-y-3" },
                shots.map((shot, index) =>
                  React.createElement(
                    "div",
                    { key: shot.id, className: "rounded-xl border border-gray-200 p-3" },
                    React.createElement(
                      "div",
                      { className: "flex items-center justify-between text-[11px] uppercase tracking-[0.4em] text-gray-500" },
                      React.createElement("span", null, `小图 ${index + 1}`),
                      shots.length > 3
                        ? React.createElement(
                            "button",
                            {
                              type: "button",
                              onClick: () => removeShot(shot.id),
                              className: "text-[11px] text-gray-500 hover:text-red-500",
                            },
                            "删除",
                          )
                        : null,
                    ),
                    React.createElement("input", {
                      value: shot.label,
                      onChange: (event) => updateShotLabel(shot.id, event.target.value),
                      className:
                        "mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none",
                      placeholder: "说明文字（可选）",
                    }),
                    React.createElement("input", {
                      type: "file",
                      accept: "image/*",
                      onChange: (event) => updateShotImage(event, shot.id),
                      className: "mt-2 w-full cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm",
                    }),
                  ),
                ),
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: addShot,
                  disabled: shots.length >= 4,
                  className:
                    "inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-900 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40",
                },
                "+ 新增小图",
              ),
            ),
          ),
          React.createElement(AssetPreviewPanel, {
            brandLogo,
            brandName,
            agentName,
            headline,
            tagline,
            seriesDescription,
            productName,
          scenarioImage,
          productImage,
          shots,
          features,
          confirmationStatus: assetConfirmation.status,
          confirmedAt: assetConfirmation.confirmedAt,
          onConfirm: confirmAssets,
          canConfirm: canConfirmAssets,
        }),
        React.createElement(
          "div",
          { className: "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" },
          React.createElement(
            "div",
            { className: "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" },
            React.createElement(StepBadge, { number: 2, label: "调用 Glibatree" }),
            React.createElement(
              "span",
              { className: `text-xs ${isAssetsConfirmed ? "text-gray-500" : "text-amber-600"}` },
              isAssetsConfirmed
                ? "素材已确认，可直接调用 Glibatree Art Designer 生成新版设计。"
                : "请先完成上方“素材确认”，再调用 Glibatree 生成新版设计。",
            ),
          ),
          React.createElement(
            "div",
            { className: "mt-4 space-y-4" },
              React.createElement(
                "div",
                null,
                React.createElement(
                  "label",
                  { className: "text-sm font-medium text-gray-700" },
                  "接口地址",
                ),
                React.createElement("input", {
                  value: glibatreeEndpoint,
                  onChange: (event) => setGlibatreeEndpoint(event.target.value),
                  className:
                    "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none",
                  placeholder: "https://designer.glibatree.com/api/v1/design",
                }),
              ),
              React.createElement(
                "div",
                null,
                React.createElement(
                  "label",
                  { className: "text-sm font-medium text-gray-700" },
                  "API Key（可选）",
                ),
                React.createElement("input", {
                  type: "password",
                  value: glibatreeApiKey,
                  onChange: (event) => setGlibatreeApiKey(event.target.value),
                  className:
                    "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none",
                  placeholder: "如需鉴权可填写",
                }),
              ),
              React.createElement(
                "div",
                null,
                React.createElement(
                  "div",
                  { className: "flex items-center justify-between" },
                  React.createElement(
                    "label",
                    { className: "text-sm font-medium text-gray-700" },
                    "生成的提示词",
                  ),
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      onClick: handleCopyPrompt,
                      className: "text-xs font-medium text-accent hover:underline",
                    },
                    copyState === "success" ? "已复制" : copyState === "error" ? "复制失败" : "复制",
                  ),
                ),
                React.createElement("textarea", {
                  value: glibatreePrompt,
                  readOnly: true,
                  rows: 8,
                  className:
                    "mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-700",
                }),
              ),
              React.createElement(
                "div",
                { className: "flex flex-wrap items-center gap-3" },
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: callGlibatreeDesigner,
                    disabled: designerStatus === "loading" || !isAssetsConfirmed,
                    className:
                      "inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#b40018] disabled:cursor-not-allowed disabled:opacity-60",
                  },
                  designerStatus === "loading" ? "请求中..." : "调用 Glibatree 绘制",
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: resetDesigner,
                    className:
                      "inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-900 hover:text-gray-900",
                  },
                  "重置结果",
                ),
              ),
              React.createElement(
                "div",
                {
                  className: `rounded-lg border px-3 py-2 text-xs leading-relaxed ${
                    designerStatus === "error"
                      ? "border-red-200 bg-red-50 text-red-600"
                      : designerStatus === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : designerStatus === "loading"
                      ? "border-blue-200 bg-blue-50 text-blue-600"
                      : "border-gray-200 bg-gray-50 text-gray-500"
                  }`,
                },
                designerStatus === "idle"
                  ? "准备就绪，填写内容后可调用 Glibatree Art Designer。"
                  : designerStatus === "loading"
                  ? designerMessage
                  : designerStatus === "success"
                  ? designerMessage || "绘制请求已完成。"
                  : designerMessage || "调用失败，请检查配置。",
              ),
              designerResult?.imageSrc
                ? React.createElement(
                    "div",
                    { className: "rounded-xl border border-gray-200 bg-gray-50 p-3" },
                    React.createElement(
                      "div",
                      { className: "mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-gray-500" },
                      React.createElement("span", null, "生成预览"),
                      React.createElement(
                        "button",
                        {
                          type: "button",
                          onClick: downloadDesignerImage,
                          className: "text-[11px] font-medium text-accent hover:underline",
                        },
                        "下载/打开",
                      ),
                    ),
                    React.createElement(
                      "div",
                      { className: "overflow-hidden rounded-lg border border-gray-200 bg-white" },
                      React.createElement("img", {
                        src: designerResult.imageSrc,
                        alt: "Glibatree 生成结果",
                        className: "w-full",
                      }),
                    ),
                  )
                : null,
              designerResult?.data
                ? React.createElement(
                    "details",
                    { className: "rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600" },
                    React.createElement(
                      "summary",
                      { className: "cursor-pointer text-sm font-semibold text-gray-700" },
                      "查看响应详情",
                    ),
                    React.createElement(
                      "pre",
                      {
                        className:
                          "mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all bg-white p-3 text-[11px] leading-relaxed text-gray-700",
                      },
                      JSON.stringify(designerResult.data, null, 2),
                    ),
                  )
                : null,
            ),
          ),
        ),
        React.createElement(
          "div",
          { className: "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" },
          React.createElement(
            "div",
            { className: "mb-4 flex items-center justify-between" },
            React.createElement(SectionTitle, null, "海报预览"),
            React.createElement(
              "div",
              { className: "text-xs text-gray-500" },
              "推荐尺寸：900 × 1400 px",
            ),
          ),
          React.createElement(
            "div",
            { className: "w-full overflow-auto" },
            React.createElement(PosterPreview, {
              ref: posterRef,
              brandName,
              brandLogo,
              agentName,
              headline,
              tagline,
              taglineAlign,
              scenarioImage,
              productName,
              productImage,
              features,
              seriesDescription,
              shots,
            }),
          ),
        ),
      ),
    ),
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));

