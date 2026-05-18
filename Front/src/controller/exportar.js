import * as XLSX from 'xlsx';

function descargarCSV(filas, nombre) {
    if (!filas.length) return;
    const cabecera = Object.keys(filas[0]).join(',');
    const contenido = filas.map(f =>
        Object.values(f).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob(['﻿' + cabecera + '\n' + contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre + '.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function descargarExcel(filas, nombre) {
    if (!filas.length) return;
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    XLSX.writeFile(wb, nombre + '.xlsx');
}

export { descargarCSV, descargarExcel };
