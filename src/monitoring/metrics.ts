import { Counter, Histogram, Registry } from "prom-client";

export const register = new Registry();

export const httpRequestDurationMicroseconds = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "code"],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

export const urlCreationCounter = new Counter({
  name: "url_creation_total",
  help: "Total number of URL creations",
});

export const urlRedirectCounter = new Counter({
  name: "url_redirect_total",
  help: "Total number of URL redirects",
});

register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(urlCreationCounter);
register.registerMetric(urlRedirectCounter);
