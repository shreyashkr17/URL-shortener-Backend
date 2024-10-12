import http from "k6/http";
import { check, sleep } from "k6";

// Array of ports to send requests to
const ports = [5000, 5001, 5002, 5003, 5004, 5005, 5006, 5007];

export const options = {
  stages: [
    { duration: "2m", target: 120 }, // Ramp up to 120 RPS
    { duration: "5m", target: 120 }, // Stay at 120 RPS for 5 minutes
    { duration: "2m", target: 0 },   // Ramp down
  ],
};

export default function () {
  // Choose a random port from the ports array
  const port = ports[Math.floor(Math.random() * ports.length)];

  // Test the URL shortening endpoint
  const shortenPayload = JSON.stringify({
    original_url: `https://www.amazon.jobs/en-gb/business_categories/student-programs`,
  });
  const shortenParams = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const shortenRes = http.post(`http://127.0.0.1:${port}/shorten`, shortenPayload, shortenParams);

  // Log the response body for debugging
  console.log("Shorten response body:", shortenRes.body);

  // Check the response status
  check(shortenRes, {
    "shorten status is 200": (r) => r.status === 200,
  });

  let shortUrl;
  try {
    const body = JSON.parse(shortenRes.body);
    // Check if the expected structure is present
    if (body.url && body.url.short_url) {
      shortUrl = body.url.short_url;
      console.log("Short URL:", shortUrl);
    } else {
      console.error("Response does not have the expected structure:", body);
      return; // Exit if the structure is not as expected
    }
  } catch (e) {
    console.error("Failed to parse shorten response or missing short_url:", e);
    return;
  }

  // Test the redirection endpoint
  const redirectRes = http.get(shortUrl);

  check(redirectRes, {
    "redirect status is 301 or 302": (r) => r.status === 301 || r.status === 302,
    "redirect location is set": (r) => r.headers.Location !== undefined,
  });

  sleep(1);
}
