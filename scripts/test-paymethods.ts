import assert from "node:assert/strict";
import { normalizeBic, normalizeSortCode, normalizeRouting, normalizeAccountNumber, bankComplete, normalizeIntlPhone, normalizeWero, activeMethods, methodUrl, normalizeIban, normalizePaypal, normalizeRevtag, isWiseUrl, normalizeUrl, paymentReference } from "../src/lib/payMethods";

assert.equal(normalizeIban("mt84 malt 0110 0001 2345 mtlc ast0 01s"), "MT84 MALT 0110 0001 2345 MTLC AST0 01S");
assert.equal(normalizeIban("DE89370400440532013000"), "DE89 3704 0044 0532 0130 00");
assert.equal(normalizeIban("DE89370400440532013001"), null);
assert.equal(normalizeRevtag("@jane.doe"), "jane.doe");
assert.equal(normalizeRevtag("https://revolut.me/janedoe"), "janedoe");
assert.equal(normalizePaypal("paypal.me/JaneDoe"), "JaneDoe");
assert.equal(normalizePaypal("https://www.paypal.com/paypalme/JaneDoe"), "JaneDoe");
assert.equal(isWiseUrl("https://wise.com/pay/me/janed"), "https://wise.com/pay/me/janed");
assert.equal(isWiseUrl("https://evil.example/wise.com"), null);
assert.equal(normalizeUrl("http://insecure.example"), null);
assert.equal(methodUrl("paypal", { paypal: "JaneDoe" }, 3000, "eur"), "https://paypal.me/JaneDoe/30.00EUR");
assert.deepEqual(activeMethods({ cash: true, revolut: "x", bank: { holder: "", iban: "" } }), ["revolut"]); // cash is no longer offered
assert.equal(paymentReference({ id: "7kq2m9abcdefghjk" }), "ETP-7KQ2M9");
assert.equal(normalizeIntlPhone("+34 612 34 56 78"), "+34612345678");
assert.equal(normalizeIntlPhone("0035699123456"), "+35699123456");
assert.equal(normalizeIntlPhone("612345678"), null);
assert.equal(normalizeWero("Host@Example.com"), "host@example.com");
assert.equal(methodUrl("card", { card: { url: "https://pay.sumup.com/b2c/X", brands: ["visa"] } }, 100, "EUR"), "https://pay.sumup.com/b2c/X");
assert.deepEqual(activeMethods({ cash: true, cardOnArrival: { brands: [] }, card: { url: "https://x.test", brands: [] }, bizum: "+34612345678" }), ["card", "bizum"]);
assert.equal(normalizeBic("vall mt mt"), "VALLMTMT");
assert.equal(normalizeBic("DEUTDEFF500"), "DEUTDEFF500");
assert.equal(normalizeBic("VALL1T"), null);
assert.equal(normalizeSortCode("123456"), "12-34-56");
assert.equal(normalizeRouting("021000021"), "021000021"); // JPMorgan Chase NY
assert.equal(normalizeRouting("021000022"), null);
assert.equal(normalizeAccountNumber("12345678", "uk"), "12345678");
assert.equal(normalizeAccountNumber("1234567", "uk"), null);
assert.equal(bankComplete({ holder: "A", iban: "MT84…" }), true);
assert.equal(bankComplete({ holder: "A", accountType: "uk", sortCode: "12-34-56" }), false);
console.log("✓ payment method tests passed");
