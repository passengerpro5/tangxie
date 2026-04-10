export function formDataToRecord(formData: FormData) {
  return Array.from(formData.entries()).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key] = String(value);
    return acc;
  }, {});
}
