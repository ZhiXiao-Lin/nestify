import * as _ from 'lodash';
import * as Excel from 'exceljs';

export enum ExcelHandleType {
    KV,
    ARRAY
}

export class ExcelHelper {
    static async loadFromFile(filePath, sheetsMap) {
        const workbook = new Excel.Workbook();
        await workbook.xlsx.readFile(filePath);

        return await ExcelHelper.load(workbook, sheetsMap);
    }

    static async loadFromBuffer(buffer, sheetsMap) {
        const workbook = new Excel.Workbook();
        await workbook.xlsx.load(buffer);

        return await ExcelHelper.load(workbook, sheetsMap);
    }

    static async load(workbook, sheetsMap) {
        const info = {};

        workbook.eachSheet((worksheet) => {
            const sheetMap = sheetsMap[worksheet.name];
            if (!sheetMap) {
                console.error(`${worksheet.name} 工作表映射加载失败！`);
                return;
            }

            let item = null;

            switch (sheetMap.handleType) {
                case ExcelHandleType.KV:
                    const rowsMap = sheetMap.rowsMap;
                    if (!rowsMap) throw new Error(`${worksheet.name} 行映射加载失败！`);

                    item = {};
                    worksheet.eachRow((row, rowNumber) => {
                        const cellKey = row.getCell(1);
                        if (!cellKey) return false;

                        const mapKey = rowsMap[cellKey.value.toString()];
                        if (!mapKey)
                            throw new Error(
                                `${worksheet.name} [row:${rowNumber}] 列映射加载失败！`
                            );

                        item[mapKey] = row.getCell(2).value;
                    });

                    break;
                case ExcelHandleType.ARRAY:
                    const cellsMap = sheetMap.cellsMap;
                    if (!cellsMap) throw new Error(`${worksheet.name} 表头映射加载失败！`);

                    const titleArr = [];

                    item = [];
                    worksheet.getRow(1).eachCell((cell, cellNumber) => {
                        const mapKey = cellsMap[cell.value.toString()];
                        if (!mapKey) throw new Error(`${worksheet.name} 表头列映射加载失败！`);

                        titleArr[cellNumber] = mapKey;
                    });

                    worksheet.eachRow((row, rowNumber) => {
                        if (rowNumber <= 1) return false;

                        const cellObj = {};
                        row.eachCell((cell, cellNumber) => {
                            const obj = titleArr[cellNumber].split('.');

                            if (_.isArray(obj) && obj.length >= 2) {
                                if (!cellObj[obj[0]]) {
                                    cellObj[obj[0]] = {};
                                }

                                cellObj[obj[0]][obj[1]] = cell.value;
                            } else {
                                cellObj[titleArr[cellNumber]] = cell.value;
                            }
                        });

                        item.push(cellObj);
                    });
                default:
                    break;
            }

            info[sheetMap.map || worksheet.name] = item;
        });

        return info;
    }

    static async export(dataSource, sheetsMap, fields) {
        const workbook = new Excel.Workbook();
        const sheet = workbook.addWorksheet(sheetsMap.map);
        const rowsMap = sheetsMap.rowsMap;

        const columns = fields
            .map((item) => {
                if (!!rowsMap[item]) {
                    rowsMap[item].key = rowsMap[item].key ? rowsMap[item].key : item;
                    return rowsMap[item];
                }
            })
            .filter((item) => !!item);

        const rows = dataSource.map((item) => {
            const row = {};

            Object.keys(rowsMap).forEach((key) => {
                if (fields.includes(key)) {
                    const handler = rowsMap[key].handler || ((val) => val);
                    const headerKey = rowsMap[key].key || key;

                    const obj = key.split('.');

                    if (_.isArray(obj) && obj.length >= 2) {
                        row[key] = handler(item[obj[0]]);
                    } else {
                        row[headerKey] = handler(item[headerKey]);
                    }
                }
            });

            return row;
        });

        sheet.columns = columns;
        sheet.addRows(rows);

        return await workbook.xlsx.writeBuffer();
    }
}

export default ExcelHelper;
