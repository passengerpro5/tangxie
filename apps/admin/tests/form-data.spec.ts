import assert from "node:assert/strict";
import test from "node:test";

import { formDataToRecord } from "../src/ui/form-data.ts";

test("formDataToRecord converts FormData entries into string records", () => {
  const formData = new FormData();
  formData.set("name", "AiHubMix");
  formData.set("providerType", "openai_compatible");
  formData.set("defaultModel", "gpt-4o-mini");

  assert.deepEqual(formDataToRecord(formData), {
    name: "AiHubMix",
    providerType: "openai_compatible",
    defaultModel: "gpt-4o-mini",
  });
});
