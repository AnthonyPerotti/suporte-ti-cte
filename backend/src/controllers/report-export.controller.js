const { PrismaClient } = require('@prisma/client');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const { getSlaStatus } = require('../services/sla.service');

const prisma = new PrismaClient();

const exportPdf = async (req, res) => {
  try {
    const { from, to, technician_id, category_id } = req.query;

    const startDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = to ? new Date(to) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const where = {
      created_at: { gte: startDate, lte: endDate },
      ...(technician_id && { assignee_id: technician_id }),
      ...(category_id && { category_id }),
    };

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        assignee: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio-chamados-${startDate.toISOString().split('T')[0]}.pdf"`
    );

    doc.pipe(res);

    // UFSM Logo Header
    const logoPath = path.join(__dirname, '..', 'assets', 'ufsm-logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 35, { width: 140 });
    }

    doc.font('Helvetica-Bold').fontSize(16).fillColor('#1e3a5f').text('UNIVERSIDADE FEDERAL DE SANTA MARIA', 200, 35);
    doc.font('Helvetica').fontSize(11).fillColor('#475569').text('Centro de Tecnologia - CTE | Suporte TI', 200, 55);
    doc.fontSize(10).fillColor('#64748b').text(`Relatório de Atendimentos: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`, 200, 72);

    doc.moveTo(40, 100).lineTo(555, 100).strokeColor('#cbd5e1').lineWidth(1).stroke();

    // Summary Box
    doc.rect(40, 115, 515, 60).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(11);
    
    const total = tickets.length;
    const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    const open = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
    
    doc.text(`Total de Chamados: ${total}`, 55, 130);
    doc.text(`Resolvidos/Encerrados: ${resolved}`, 215, 130);
    doc.text(`Em Andamento: ${open}`, 405, 130);

    // Table Header
    let y = 195;
    doc.rect(40, y, 515, 24).fill('#1e3a5f');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
    doc.text('ID', 48, y + 7);
    doc.text('TÍTULO / SOLICITANTE', 105, y + 7);
    doc.text('CATEGORIA', 310, y + 7);
    doc.text('STATUS', 415, y + 7);
    doc.text('ABERTURA', 485, y + 7);

    y += 24;

    doc.font('Helvetica').fontSize(8);
    tickets.slice(0, 30).forEach((t, i) => {
      if (y > 750) {
        doc.addPage();
        y = 40;
      }

      const bg = i % 2 === 0 ? '#ffffff' : '#f1f5f9';
      doc.rect(40, y, 515, 22).fill(bg);

      doc.fillColor('#334155').text(`#${t.id.slice(0, 8).toUpperCase()}`, 48, y + 6);
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(t.title.slice(0, 35), 105, y + 6);
      doc.font('Helvetica').fillColor('#64748b').text(t.category ? t.category.name : 'Geral', 310, y + 6);
      doc.fillColor('#2563eb').text(t.status.toUpperCase(), 415, y + 6);
      doc.fillColor('#475569').text(new Date(t.created_at).toLocaleDateString('pt-BR'), 485, y + 6);

      y += 22;
    });

    // Footer
    doc.fontSize(8).fillColor('#94a3b8').text(`Gerado em ${new Date().toLocaleString('pt-BR')} pelo Sistema de Suporte TI CTE`, 40, 780, { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('Erro ao exportar PDF:', err);
    res.status(500).json({ error: 'Erro ao gerar relatório PDF' });
  }
};

const exportExcel = async (req, res) => {
  try {
    const { from, to, technician_id, category_id } = req.query;

    const startDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = to ? new Date(to) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const where = {
      created_at: { gte: startDate, lte: endDate },
      ...(technician_id && { assignee_id: technician_id }),
      ...(category_id && { category_id }),
    };

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        assignee: { select: { name: true, email: true } },
        category: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Suporte TI CTE UFSM';

    // Sheet 1: Detalhado
    const sheet1 = workbook.addWorksheet('Chamados Detalhados');
    sheet1.columns = [
      { header: 'ID Chamado', key: 'id', width: 14 },
      { header: 'Título', key: 'title', width: 35 },
      { header: 'Solicitante', key: 'user', width: 25 },
      { header: 'E-mail Solicitante', key: 'email', width: 28 },
      { header: 'Técnico Responsável', key: 'tech', width: 25 },
      { header: 'Categoria', key: 'category', width: 20 },
      { header: 'Prioridade', key: 'priority', width: 12 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Data Abertura', key: 'created_at', width: 18 },
      { header: 'Data Encerramento', key: 'closed_at', width: 18 },
    ];

    // Header styling
    sheet1.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A5F' } };

    tickets.forEach(t => {
      sheet1.addRow({
        id: `#${t.id.slice(0, 8).toUpperCase()}`,
        title: t.title,
        user: t.user?.name || 'N/A',
        email: t.user?.email || 'N/A',
        tech: t.assignee?.name || 'Não atribuído',
        category: t.category?.name || 'Geral',
        priority: t.priority.toUpperCase(),
        status: t.status.toUpperCase(),
        created_at: new Date(t.created_at).toLocaleString('pt-BR'),
        closed_at: t.closed_at ? new Date(t.closed_at).toLocaleString('pt-BR') : '—',
      });
    });

    // Sheet 2: Resumo Executivo
    const sheet2 = workbook.addWorksheet('Resumo Executivo');
    sheet2.columns = [
      { header: 'Métrica', key: 'metric', width: 30 },
      { header: 'Valor', key: 'value', width: 15 },
    ];
    sheet2.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };

    const total = tickets.length;
    const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    const open = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

    sheet2.addRow({ metric: 'Período', value: `${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}` });
    sheet2.addRow({ metric: 'Total de Chamados Registrados', value: total });
    sheet2.addRow({ metric: 'Chamados Atendidos/Encerrados', value: resolved });
    sheet2.addRow({ metric: 'Chamados em Andamento', value: open });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio-chamados-${startDate.toISOString().split('T')[0]}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Erro ao exportar Excel:', err);
    res.status(500).json({ error: 'Erro ao gerar planilha Excel' });
  }
};

module.exports = {
  exportPdf,
  exportExcel,
};
