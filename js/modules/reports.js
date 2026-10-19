/**
 * MEU ASSESSOR OS · RELATÓRIOS EXECUTIVOS (PDF & EXCEL DOWNLOAD)
 * Generates formatted CSV/Excel and print-ready executive PDF reports.
 */

class ReportsModule {
    constructor(store) {
        this.store = store;
        this.init();
    }

    init() {
        window.triggerReportDownload = () => this.generateExcelReport();
        window.triggerPdfReport = () => this.generatePdfReport();

        const btnExportPdf = document.getElementById('btnExportReportPdf');
        if (btnExportPdf) {
            btnExportPdf.addEventListener('click', () => this.generatePdfReport());
        }

        const btnExportExcel = document.getElementById('btnExportReportExcel');
        if (btnExportExcel) {
            btnExportExcel.addEventListener('click', () => this.generateExcelReport());
        }
    }

    generateExcelReport() {
        const txs = this.store.state.transactions;
        let csvContent = '\uFEFF'; // UTF-8 BOM
        csvContent += 'Data;Tipo;Descrição;Categoria;Valor (R$);Forma de Pagamento;Status\n';

        txs.forEach(t => {
            csvContent += `${t.date};${t.type.toUpperCase()};"${t.description}";${t.category};${t.amount.toFixed(2).replace('.', ',')};${t.paymentMethod || 'PIX'};${t.status}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `MeuAssessor_Relatorio_Mensal_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.showToast('Planilha Excel (.csv) gerada e baixada com sucesso!');
    }

    generatePdfReport() {
        const txs = this.store.state.transactions;
        const totalReceitas = txs.filter(t => t.type === 'receita').reduce((a, b) => a + b.amount, 0);
        const totalDespesas = txs.filter(t => t.type === 'despesa').reduce((a, b) => a + b.amount, 0);
        const saldo = totalReceitas - totalDespesas;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            window.showToast('Por favor, permita pop-ups para gerar o relatório impresso/PDF.');
            return;
        }

        const rows = txs.map(t => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${t.date}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>${t.description}</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${t.category}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; color: ${t.type === 'receita' ? '#10b981' : '#f43f5e'}">
                    ${t.type === 'receita' ? '+' : '-'} R$ ${t.amount.toFixed(2)}
                </td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Relatório Executivo Mensal · Meu Assessor OS</title>
                <style>
                    body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1e293b; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #00a884; padding-bottom: 20px; }
                    .kpis { display: flex; gap: 20px; margin: 30px 0; }
                    .kpi-card { flex: 1; padding: 15px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; }
                    .kpi-val { font-size: 20px; font-weight: bold; margin-top: 5px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background: #0f172a; color: white; padding: 10px; text-align: left; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h2>MEU ASSESSOR OS · RELATÓRIO EXECUTIVO</h2>
                        <p>Gestão Financeira & Conciliação Bancária Open Finance (114 Instituições)</p>
                    </div>
                    <div>
                        <p><strong>Titular:</strong> ${this.store.state.user.name}</p>
                        <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>

                <div class="kpis">
                    <div class="kpi-card">
                        <div>Total de Entradas</div>
                        <div class="kpi-val" style="color: #10b981;">R$ ${totalReceitas.toFixed(2)}</div>
                    </div>
                    <div class="kpi-card">
                        <div>Total de Saídas</div>
                        <div class="kpi-val" style="color: #f43f5e;">R$ ${totalDespesas.toFixed(2)}</div>
                    </div>
                    <div class="kpi-card">
                        <div>Resultado Líquido</div>
                        <div class="kpi-val" style="color: #3b82f6;">R$ ${saldo.toFixed(2)}</div>
                    </div>
                </div>

                <h3>Lançamentos do Período</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Descrição</th>
                            <th>Categoria</th>
                            <th style="text-align: right;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
                <div style="margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px;">
                    Relatório gerado automaticamente pelos assessores Theo, Martin e Rita · Conforme LGPD e Banco Central
                </div>
                <script>
                    window.onload = function() { window.print(); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        window.showToast('Janela de impressão / PDF aberta!');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.reportsModule = new ReportsModule(window.appStore);
});
