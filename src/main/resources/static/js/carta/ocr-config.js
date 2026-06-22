// ocr-config.js
export async function inicializarScannerTesseract() {
    console.log("🛰️ [TESSERACT] Configurando motor óptico de alta definición...");
    const worker = await Tesseract.createWorker('spa');
    await worker.setParameters({
        tessedit_char_whitelist: '0123456789S/.abcdefghijklmnopqrstuvwxyzí¡!',
        tessall_default_page_seg_mode: '1' // Modo automático por bloques
    });
    return worker;
}