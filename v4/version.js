function openMoreDialog() {
  openModal(`
    <div class="modal-header"><div><h2>書き出しと設定</h2><div class="modal-subtitle">原稿を保存・共有します。</div></div><button class="icon-button" data-modal-action="close">×</button></div>
    <div class="option-grid">
      <button class="option-card" data-modal-action="export-md">Markdownを書き出す</button>
      <button class="option-card" data-modal-action="export-txt">本文テキストを書き出す</button>
      <button class="option-card" data-modal-action="export-json">完全JSONを退避する</button>
      <button class="option-card" data-modal-action="import">別の原稿を読み込む</button>
      <button class="option-card" data-modal-action="help">ショートカットを見る</button>
      <button class="option-card" data-modal-action="undo">元に戻す</button>
    </div>
    <p class="privacy-note">myspines 0.4.4 ・ 原稿は外部へ送信されません。</p>
  `);
}
