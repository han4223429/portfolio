// Reject an OCR response after its photo, SKU, or input generation changes.
export function isCurrentOcrRequest(request,current){
 return request.generation===current.generation && request.sku===current.sku && request.file===current.file;
}
