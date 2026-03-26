import fetch from "node-fetch";

async function run() {
    console.log("=== STEP 1: Fetching Raw Exchange Rate ===");
    const exchangeRes = await fetch("https://open.er-api.com/v6/latest/USD");
    const exchangeData: any = await exchangeRes.json();
    const usdToPkr = exchangeData.rates?.PKR;

    console.log("Raw Currency Data:");
    console.log(JSON.stringify({
        base: exchangeData.base_code,
        timestamp: new Date(exchangeData.time_last_update_unix * 1000).toISOString(),
        pkr_rate: usdToPkr
    }, null, 2));

    const goldApiKey = "goldapi-jkinksmluw455d-io";
    console.log("\n=== STEP 2: Fetching Raw Gold API Rate ===");
    const goldRes = await fetch("https://www.goldapi.io/api/XAU/USD", {
        headers: { "x-access-token": goldApiKey }
    });
    const goldData: any = await goldRes.json();

    console.log("Raw Gold Data:");
    console.log(JSON.stringify({
        metal: goldData.metal,
        currency: goldData.currency,
        timestamp: new Date(goldData.timestamp * 1000).toISOString(),
        price_ounce: goldData.price,
        price_gram_24k: goldData.price_gram_24k,
        price_gram_22k: goldData.price_gram_22k
    }, null, 2));

    console.log("\n=== STEP 3: Verifying Math Conversions ===");
    const pricePerOunce = goldData.price;
    console.log(`1. price_per_ounce_usd = ${pricePerOunce}`);

    // API provides price_gram_24k, but let's verify math
    const manual_price_per_gram_usd = pricePerOunce / 31.1034768;
    console.log(`2. price_per_gram_usd (calculated from ounce / 31.1034768) = ${manual_price_per_gram_usd}`);
    console.log(`   (API provided price_gram_24k: ${goldData.price_gram_24k})`);

    const price_per_gram_pkr = manual_price_per_gram_usd * usdToPkr;
    console.log(`3. price_per_gram_pkr (usd_gram * ${usdToPkr}) = ${price_per_gram_pkr}`);

    const price_per_tola_pkr = price_per_gram_pkr * 11.664;
    console.log(`4. price_per_tola_pkr (pkr_gram * 11.664) = ${price_per_tola_pkr}`);

    console.log("\n=== STEP 4: Purity Checks ===");
    const tola22k = price_per_tola_pkr * (22 / 24);
    console.log(`24K Tola Rate = ${price_per_tola_pkr}`);
    console.log(`22K Tola Rate (24K * 22/24) = ${tola22k}`);

}

run().catch(console.error);
