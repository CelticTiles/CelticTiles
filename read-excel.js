import XLSX from "xlsx";

const workbook = XLSX.readFile("Features to Add.xlsx");
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const jsonData = XLSX.utils.sheet_to_json(worksheet);

console.log(JSON.stringify(jsonData, null, 2));
