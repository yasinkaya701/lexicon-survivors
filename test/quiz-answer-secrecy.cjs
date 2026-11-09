const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(os.homedir(), '.codex/skills/develop-web-game/node_modules/playwright'));

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8000', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Array.isArray(state.questions) && state.questions.length > 0);
    await page.evaluate(() => {
      const card = state.questions.find(question => question.word === 'No sooner ... than');
      state.ink_count = 999;
      shopCards = [card];
      currentShopTab = 'cards';
      renderShopView();
    });
    assert.equal(await page.locator('.shop-example').innerText(), '', 'shop preview hides an example containing the exact translation');
    await page.evaluate(() => {
      shopCards = [state.questions.find(question => question.word === 'Fall short of')];
      renderShopView();
    });
    assert.match(await page.locator('.shop-example').innerText(), /fell short/, 'shop preview keeps a safe English example');

    await page.evaluate(() => {
      const card = state.questions.find(question => question.word === 'Fall short of');
      if (!card) throw new Error('Expected quiz fixture is missing');
      document.querySelector('#archive-intro')?.setAttribute('hidden', '');
      document.querySelector('#title-screen').style.display = 'none';
      state.ink_count = 999;
      state.mistake_words = [];
      shopCards = [card];
      openQuiz(card, 0);
    });

    const target = await page.evaluate(() => {
      const card = state.questions.find(question => question.word === 'Fall short of');
      return { answer: card.options[card.correct_index], meaning: card.meaning_tr, effect: card.description, cost: card.cost };
    });
    const preAnswerText = await page.locator('#quiz-modal').innerText();
    const preAnswerBuff = await page.locator('#quiz-buff-text').innerText();
    assert.equal(preAnswerText.split(target.answer).length - 1, 1, 'the translation should occur only in its answer option before submission');
    assert.doesNotMatch(preAnswerBuff, new RegExp(target.meaning, 'i'), 'the effect block must not reveal the semantic explanation before submission');
    assert.match(preAnswerBuff, /Mürekkep Toplama Menzili/, 'generic stat effect remains visible');

    const inkBefore = await page.evaluate(() => state.ink_count);
    await page.locator('#quiz-options-container button').filter({ hasNotText: target.answer }).first().click();
    await page.waitForFunction(() => document.querySelector('#quiz-result-text')?.dataset.outcome === 'incorrect');
    const postAnswerBuff = await page.locator('#quiz-buff-text').innerText();
    assert.match(postAnswerBuff, /Mürekkep Toplama Menzili/, 'post-answer effect remains visible');
    assert.ok(postAnswerBuff.includes(target.meaning), 'post-answer semantic explanation is revealed');
    assert.ok((await page.locator('#quiz-result-text').innerText()).includes(target.answer), 'incorrect submission reveals the correct option');
    assert.equal(await page.evaluate(() => state.ink_count), inkBefore - target.cost, 'incorrect answer cost remains unchanged');
    assert.equal(await page.evaluate(() => state.mistake_words.some(mistake => mistake.word === 'Fall short of')), true, 'incorrect answer still enters mistakes');
    assert.deepEqual(errors, []);
    console.log('quiz answer secrecy passed');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
