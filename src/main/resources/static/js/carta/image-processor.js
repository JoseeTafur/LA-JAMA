// image-processor.js
export async function aplicarFiltroBinarizado(file) {
    return new Promise((resolve) => {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width; canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;

            // Procesamiento de píxeles puros para aumentar contraste
            for (let i = 0; i < data.length; i += 4) {
                let gris = 0.34 * data[i] + 0.5 * data[i+1] + 0.16 * data[i+2];
                let binario = (gris > 125) ? 255 : 0;
                data[i] = data[i+1] = data[i+2] = binario;
            }
            ctx.putImageData(imgData, 0, 0);
            URL.revokeObjectURL(img.src);
            canvas.toBlob(resolve, 'image/png');
        };
    });
}