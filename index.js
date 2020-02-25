const puppeteer = require('puppeteer');
const CREDS = require('./creds');
const mongoose = require('mongoose');
const User = require('./models/user');

//登录相关

const USERNAME_SELECTOR = '#login_field'
const PASSWORD_SELECTOR = '#password'
const BUTTON_SELECTOR = '#login > form > div.auth-form-body.mt-3 > input.btn.btn-primary.btn-block'

//信息相关

const USER_LIST_INFO_SELECTOR = '#user_search_results > div.user-list > .user-list-item'
const USER_LIST_USERNAME_SELECTOR = 'div.f4.text-normal > a.text-gray';
const USER_LIST_AVATAR_SELECTOR = 'div.flex-shrink-0.mr-2 > a > img';


const userToSearch = 'react';
const searchUrl = 'https://github.com/search?q=' + userToSearch + '&type=Users';


async function run() {
    const browser = await puppeteer.launch({
        headless: false
    });
    const page = await browser.newPage();

    await page.goto('https://github.com/login');

    await page.type(USERNAME_SELECTOR, CREDS.username)
    await page.type(PASSWORD_SELECTOR, CREDS.password)
    await page.click(BUTTON_SELECTOR)
    await page.waitFor(2 * 1000);

    await page.goto(searchUrl);

    const numPages = await getNumPages(page);
    console.log('Numpages: ', numPages);

    // await page.waitForNavigation()

    for (let h = 1; h <= numPages; h++) {
        // 跳转到指定页码
        await page.goto(`${searchUrl}&p=${h}`);
        const users = await page.evaluate((sInfo, sName, sAvatar) => {
            return Array.from(document.querySelectorAll(sInfo))
                .map($userListItem => {

                    // 用户名
                    const username = $userListItem.querySelector(sName).innerText;
                    // 头像
                    const avatar = $userListItem.querySelector(sAvatar).src;
                    return {
                        username,
                        avatar,
                    };
                })
        }, USER_LIST_INFO_SELECTOR, USER_LIST_USERNAME_SELECTOR, USER_LIST_AVATAR_SELECTOR);

        console.log(users, h);

        users.map(({
            username,
            avatar
        }) => {
            // 保存用户信息
            upsertUser({
                username: username,
                email: avatar,
                dateCrawled: new Date()
            });
        });

    }

    browser.close();
}

run();

async function getNumPages(page) {
    const NUM_USER_SELECTOR = '#js-pjax-container > div > div.col-12.col-md-9.float-left.px-2.pt-3.pt-md-0.codesearch-results > div > div.d-flex.flex-column.flex-md-row.flex-justify-between.border-bottom.pb-3.position-relative > h3'

    let inner = await page.evaluate((sel) => {
        return document.querySelector(sel).innerHTML;
    }, NUM_USER_SELECTOR);

    // 格式是: "69,803 users"
    inner = inner.replace(',', '').replace(' users', '');
    const numUsers = parseInt(inner);
    console.log('numUsers: ', numUsers);

    /*
     * GitHub 每页显示 10 个结果
     */
    const numPages = Math.ceil(numUsers / 10);
    return numPages;

}


function upsertUser(userObj) {

    const DB_URL = 'mongodb://localhost/yiong1';
    if (mongoose.connection.readyState == 0) {
        mongoose.connect(DB_URL);
    }

    // if this username exists, update the entry, don't insert
    // 如果邮箱存在，就更新实例，不新增
    const conditions = {
        username: userObj.username
    };
    const options = {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
    };

    User.findOneAndUpdate(conditions, userObj, options, (err, result) => {
        if (err) {
            throw err;
        }
    });
}