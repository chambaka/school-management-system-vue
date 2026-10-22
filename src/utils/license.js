export function tzs(amount) {
  if (amount == null || amount === "") return "";
  return `TSH ${Number(amount).toLocaleString("en-TZ")}`;
}

export function emptyLicense() {
  return {
    billingModel: "SUBSCRIPTION",
    subscriptionPlan: "BASIC",
    billingCycle: "MONTHLY",
  };
}

export function licenseFromTenant(tenant) {
  return {
    billingModel: tenant?.billingModel || "SUBSCRIPTION",
    subscriptionPlan: tenant?.licensePackage || tenant?.subscriptionPlan || "BASIC",
    billingCycle: tenant?.billingCycle || (tenant?.billingModel === "PURCHASE" ? "" : "MONTHLY"),
  };
}

export function packageInCatalog(catalog, packId) {
  for (const model of catalog?.models || []) {
    const found = (model.packages || []).find((row) => row.id === packId);
    if (found) return { model, pack: found };
  }
  return null;
}

export function licenseSummary(tenant, catalog) {
  const modelId = tenant?.billingModel;
  const packId = tenant?.licensePackage || tenant?.subscriptionPlan;
  const found = packageInCatalog(catalog, packId);
  const modelName = found?.model?.name || (modelId === "PURCHASE" ? "Purchase" : "Subscription");
  const packName = found?.pack?.name || packId || "Not chosen";
  if (modelId === "PURCHASE") {
    const price = found?.pack?.oneTimeFeeTzs != null ? tzs(found.pack.oneTimeFeeTzs) : "";
    return price ? `${modelName} · ${packName} · ${price}` : `${modelName} · ${packName}`;
  }
  const cycle = tenant?.billingCycle;
  const price = (found?.pack?.prices || []).find((row) => row.cycle === cycle);
  const cycleLabel = price?.label || (cycle ? cycle.toLowerCase() : "monthly");
  const amount = price ? tzs(price.amountTzs) : "";
  return amount
    ? `${modelName} · ${packName} · ${cycleLabel} · ${amount}`
    : `${modelName} · ${packName}`;
}
