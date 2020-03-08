const puppeteer = require('puppeteer');


const types = [2, 3, 4, 5, 6, 7];
const searchUrl = `https://www.buxiuse.com/?cid=`

const UL_SELECTOR = `#main > div.panel-body > ul`
const LI_SELECTOR = `li.span3`
const IMG_SELECTOR = `.height_min`
const TXT_SELECTOR = `a`
const A_SELECTOR = `a`

async function run(type, numPages) {
    const browser = await puppeteer.launch({
        headless: false
    })

    const page = await browser.newPage()
    await page.goto(searchUrl);

    for (let i = 1; i < numPages; i++) {
        await page.goto(`${searchUrl}${type}&page=${i}`)
        await page.waitFor(2 * 1000);
        const items = await page.evaluate((sLi, sImg, sTxt, sA) => {
            return Array.from(document.querySelectorAll(sLi))
                .map($li => {
                    const img = $li.querySelector(sImg).src
                    const txt = $li.querySelector(sTxt).innerText
                    const a = $li.querySelector(sA).href
                    return {
                        img,
                        txt,
                        a
                    }
                })
        }, LI_SELECTOR, IMG_SELECTOR, TXT_SELECTOR, A_SELECTOR)
        console.info(items, type)
    }

    browser.close();

}

async function runAll() {
    for (let type of types) {
        await run(type, 10)
    }
}

runAll()