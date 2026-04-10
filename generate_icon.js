const Jimp = require('jimp');

new Jimp(16, 16, 0x00000000, (err, image) => {
    if (err) throw err;
    const c = 0x000000FF; // Solid black

    // Outer trunk (14x14)
    for (let x = 1; x <= 14; x++) {
        image.setPixelColor(c, x, 2);
        image.setPixelColor(c, x, 3);
        image.setPixelColor(c, x, 14);
        image.setPixelColor(c, x, 15);
    }
    for (let y = 2; y <= 15; y++) {
        image.setPixelColor(c, 1, y);
        image.setPixelColor(c, 2, y);
        image.setPixelColor(c, 13, y);
        image.setPixelColor(c, 14, y);
    }

    // Zipper
    image.setPixelColor(c, 7, 3); image.setPixelColor(c, 8, 3);
    image.setPixelColor(c, 7, 4); image.setPixelColor(c, 8, 4);
    image.setPixelColor(c, 7, 6); image.setPixelColor(c, 8, 6);
    image.setPixelColor(c, 7, 7); image.setPixelColor(c, 8, 7);

    // Zipper pull
    for (let x = 6; x <= 9; x++) {
        for (let y = 9; y <= 11; y++) {
            image.setPixelColor(c, x, y);
        }
    }

    image.write('iconTemplate.png', () => {
        console.log('16x16 Template PNG image generated successfully');
    });
});
