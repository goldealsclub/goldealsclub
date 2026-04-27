const url = "https://images2.productserve.com/?w=1200&h=1200&bg=white&trim=5&t=letterbox&url=ssl%3Acdn.blazimg.com%2F1800%2Fproduct%2Fa%2Fd%2Fadidas-kd6874-auon-1.webp&feedId=90621&k=6c06d36b097e97d18fbae3754426ba4be2fff827";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
for (const headers of [
  { "User-Agent": UA, Accept: "image/*,*/*", Referer: "https://www.google.com/" },
  { "User-Agent": UA },
  { "User-Agent": "Mozilla/5.0" },
]) {
  const r = await fetch(url, { headers });
  console.log(JSON.stringify(headers), "→", r.status);
}
