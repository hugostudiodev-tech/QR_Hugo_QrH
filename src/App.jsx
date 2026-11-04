import { useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const PRESETS = ['#111827', '#075985', '#5b21b6', '#9f1239', '#166534'];

function validUrl(value) {
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function downloadBlob(content, type, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

export default function App() {
  const qrRef = useRef(null);
  const [input, setInput] = useState('https://qr.hugowishpax.studio');
  const [foreground, setForeground] = useState(PRESETS[0]);
  const [background, setBackground] = useState('#ffffff');
  const [level, setLevel] = useState('M');
  const [size, setSize] = useState(512);
  const url = useMemo(() => validUrl(input), [input]);
  const apiUrl = `${window.location.origin}/api/qr?url=${encodeURIComponent(url || 'https://example.com')}&size=${size}&foreground=${encodeURIComponent(foreground)}&background=${encodeURIComponent(background)}&level=${level}`;

  const svg = () => qrRef.current?.querySelector('svg');
  const downloadSvg = () => {
    const node = svg();
    if (node) downloadBlob(new XMLSerializer().serializeToString(node), 'image/svg+xml', 'qr-hugo.svg');
  };
  const downloadPng = () => {
    const node = svg();
    if (!node) return;
    const image = new Image();
    const source = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(node)], { type: 'image/svg+xml' }));
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      context.fillStyle = background;
      context.fillRect(0, 0, size, size);
      context.drawImage(image, 0, 0, size, size);
      URL.revokeObjectURL(source);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'qr-hugo.png';
      link.click();
    };
    image.src = source;
  };

  return (
    <div className="qr-site">
      <header className="qr-nav">
        <a className="qr-brand" href="/" aria-label="QR Hugo — Trang chủ">
          <span className="qr-symbol" aria-hidden="true">▦</span>
          <strong>QR Hugo</strong>
        </a>
        <nav aria-label="Điều hướng chính">
          <a href="#tao-qr">Tạo QR</a>
          <a href="#api">API</a>
          <a href="https://github.com/hugostudiodev-tech/QR_Hugo_QrH" target="_blank" rel="noreferrer">Mã nguồn</a>
        </nav>
      </header>

      <main>
        <section className="qr-hero" aria-labelledby="qr-title">
          <p className="qr-kicker">Dự án cộng đồng · miễn phí mãi mãi</p>
          <h1 id="qr-title">Một đường link.<br /><span>Một mã QR của bạn.</span></h1>
          <p>Tạo, tùy chỉnh và tải mã QR ngay trên thiết bị. Không tài khoản, không quảng cáo, không lưu dữ liệu.</p>
          <a className="qr-primary" href="#tao-qr">Tạo mã QR miễn phí <span aria-hidden="true">↓</span></a>
        </section>

        <section className="qr-builder" id="tao-qr" aria-labelledby="builder-title">
          <div className="qr-form">
            <p className="qr-section-no">01 / TẠO MÃ</p>
            <h2 id="builder-title">Dán link và làm nó thành của bạn.</h2>
            <label htmlFor="qr-url">Đường link</label>
            <input
              id="qr-url"
              type="url"
              value={input}
              maxLength={2048}
              onChange={(event) => setInput(event.target.value)}
              placeholder="https://example.com"
              aria-invalid={input.length > 0 && !url}
            />
            {!url && input && <p className="qr-error" role="alert">Hãy nhập link bắt đầu bằng http:// hoặc https://</p>}

            <fieldset>
              <legend>Màu mã QR</legend>
              <div className="qr-presets">
                {PRESETS.map((color) => (
                  <button key={color} type="button" onClick={() => setForeground(color)} aria-label={`Chọn màu ${color}`} aria-pressed={foreground === color} style={{ '--swatch': color }} />
                ))}
                <label className="qr-color-picker" title="Chọn màu khác">
                  <input type="color" value={foreground} onChange={(event) => setForeground(event.target.value)} />
                  <span aria-hidden="true">＋</span>
                </label>
              </div>
            </fieldset>

            <div className="qr-row">
              <label>Nền <input type="color" value={background} onChange={(event) => setBackground(event.target.value)} /></label>
              <label>Độ nét
                <select value={level} onChange={(event) => setLevel(event.target.value)}>
                  <option value="L">Nhẹ</option><option value="M">Cân bằng</option><option value="Q">Cao</option><option value="H">Rất cao</option>
                </select>
              </label>
              <label>Kích thước
                <select value={size} onChange={(event) => setSize(Number(event.target.value))}>
                  <option value="256">256 px</option><option value="512">512 px</option><option value="1024">1024 px</option>
                </select>
              </label>
            </div>
          </div>

          <div className="qr-preview">
            <p className="qr-section-no">XEM TRƯỚC</p>
            <div className={`qr-canvas${url ? '' : ' qr-canvas--empty'}`} ref={qrRef} style={{ background }}>
              {url ? <QRCodeSVG value={url} size={280} level={level} fgColor={foreground} bgColor={background} marginSize={2} title={`Mã QR cho ${url}`} /> : <span className="qr-empty-symbol" aria-hidden="true">×</span>}
            </div>
            <p className="qr-preview-url">{url || 'Mã QR sẽ xuất hiện khi link hợp lệ.'}</p>
            <div className="qr-actions">
              <button type="button" disabled={!url} onClick={downloadPng}>Tải PNG</button>
              <button type="button" disabled={!url} onClick={downloadSvg}>Tải SVG</button>
            </div>
          </div>
        </section>

        <section className="qr-values" aria-label="Cam kết của QR Hugo">
          <article><span className="qr-value-symbol" aria-hidden="true">0₫</span><h3>0 đồng</h3><p>Không gói trả phí, không giới hạn lượt tạo.</p></article>
          <article><span className="qr-value-symbol" aria-hidden="true">—</span><h3>Không quảng cáo</h3><p>Không banner, popup hay đường link theo dõi.</p></article>
          <article><span className="qr-value-symbol" aria-hidden="true">⌁</span><h3>Riêng tư</h3><p>Trình tạo chạy trên thiết bị, link không được lưu.</p></article>
        </section>

        <section className="qr-api" id="api" aria-labelledby="api-title">
          <div>
            <p className="qr-section-no">02 / API CÔNG KHAI</p>
            <h2 id="api-title">Đưa QR Hugo vào sản phẩm của bạn.</h2>
            <p>Gọi một URL, nhận lại ảnh SVG. Không API key, không tài khoản và không database.</p>
          </div>
          <div className="qr-code-block">
            <code>GET {apiUrl}</code>
            <button type="button" onClick={() => navigator.clipboard.writeText(apiUrl)}>Sao chép</button>
          </div>
          <div className="qr-api-grid">
            <p><code>url</code><span>Link http/https, tối đa 2.048 ký tự</span></p>
            <p><code>size</code><span>128–1024 px, mặc định 512</span></p>
            <p><code>foreground</code><span>Màu QR dạng #RRGGBB</span></p>
            <p><code>background</code><span>Màu nền dạng #RRGGBB</span></p>
            <p><code>level</code><span>Mức sửa lỗi L, M, Q hoặc H</span></p>
          </div>
        </section>
      </main>

      <footer><strong>QR Hugo</strong><p>Một dự án cộng đồng của Hugo Wishpax.</p><a href="mailto:contact@hugowishpax.studio">Góp ý</a></footer>
    </div>
  );
}
