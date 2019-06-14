import _ from 'lodash';
import Excel from 'exceljs';

export const ExcelHandleType = {
  KV: 0,
  ARRAY: 1,
};

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
            if (!mapKey) throw new Error(`${worksheet.name} [row:${rowNumber}] 列映射加载失败！`);

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

  static async export(fileName, dataSource, rowsMap, fields) {
    const workbook = new Excel.Workbook();
    const sheet = workbook.addWorksheet(fileName);

    const columns = fields
      .map((item) => {
        const col = rowsMap.find(row => row.dataIndex === item);
        if (!!col) {

          col.key = col.key ? col.dataIndex : item;
          col.header = col.title ? col.title : item;
          return col;
        }
      })
      .filter((item) => !!item);

    const rows = dataSource.map((item) => {

      let data = {}

      rowsMap.forEach((row) => {

        if (fields.includes(row.key)) {

          const handler = !!row.render && row.key !== 'id' ? row.render : (val) => val;
          const headerKey = row.key || row.dataIndex;

          const obj = row.key.split('.');

          if (_.isArray(obj) && obj.length >= 2) {
            data[row.key] = handler(item[obj[0]][obj[1]], item, row.dataIndex);
          } else {
            data[headerKey] = handler(item[headerKey], item, row.dataIndex);
          }
        }
      });

      return data;
    });

    sheet.columns = columns;
    sheet.addRows(rows);

    ExcelHelper.downloadBuffer(await workbook.xlsx.writeBuffer(), fileName);
  }

  static downloadBuffer(buffer, fileName) {
    const download = document.createElement('a');
    download.href = window.URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.ms-excel' }))
    download.download = fileName;
    download.click();
    window.URL.revokeObjectURL(download.href);
  }
}
