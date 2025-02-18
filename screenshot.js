const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    // Launch the browser with --no-sandbox option
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Navigate to the MintbayU course page
    const url = 'https://bayerischer-untermain.de/mint-nachwuchsfoerderung/mint-projekte/mintbayu/';
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Extract course details
    const courses = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.em-event.em-item')).map(item => ({
            date: item.querySelector('.em-event-date')?.textContent.trim() || '',
            name: item.querySelector('.em-item-title a')?.textContent.trim() || '',
            element: item
        }));
    });

    // Convert date format and filter out invalid dates
    const parseDate = (dateStr) => {
        const match = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        return match ? new Date(`${match[3]}-${match[2]}-${match[1]}`) : null;
    };

    const today = new Date().toISOString().split('T')[0];
    const sortedCourses = courses
        .map(course => ({ ...course, date: parseDate(course.date) }))
        .filter(course => course.date && course.date.toISOString().split('T')[0] !== today)
        .sort((a, b) => b.date - a.date);

    // Ensure at least 3 courses exist
    if (sortedCourses.length >= 3) {
        const firstMostRecentHandle = await page.$(`.em-event.em-item:nth-of-type(${1})`);
        // Remove the first course from the webpage
        await firstMostRecentHandle.evaluate(el => el.remove());

        const secondMostRecentHandle = await page.$(`.em-event.em-item:nth-of-type(${2})`);
        const thirdMostRecentHandle = await page.$(`.em-event.em-item:nth-of-type(${3})`);

        const secondBox = await secondMostRecentHandle.boundingBox();
        const thirdBox = await thirdMostRecentHandle.boundingBox();

        if (secondBox && thirdBox) {
            const x = Math.min(secondBox.x, thirdBox.x) - 20;
            const y = Math.min(secondBox.y, thirdBox.y)  - 5;
            const width = Math.max(secondBox.x + secondBox.width, thirdBox.x + thirdBox.width) - x + 20;
            const height = Math.max(secondBox.height, thirdBox.height) + 45;

            // Save the screenshot as image.png
            await page.screenshot({ path: 'image.png', clip: { x, y, width, height } });
        }
    }

    await browser.close();
})();
