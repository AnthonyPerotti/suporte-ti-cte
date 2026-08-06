const { PrismaClient } = require('@prisma/client');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const { getSlaStatus, getBusinessHoursBetween } = require('../services/sla.service');

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

    // Watermark background function
    const drawWatermark = () => {
      const watermarkPath = path.join(__dirname, '..', 'assets', 'ufsm-watermark.png');
      if (fs.existsSync(watermarkPath)) {
        doc.save();
        doc.opacity(0.16);
        doc.image(watermarkPath, 110, 230, { width: 375 });
        doc.restore();
      }
    };

    doc.on('pageAdded', () => {
      drawWatermark();
    });

    // Draw watermark on first page
    drawWatermark();

    // Logos Header
    const ufsmLogoPath = path.join(__dirname, '..', 'assets', 'ufsm-logo-header.png');
    const cteLogoPath = path.join(__dirname, '..', 'assets', 'cte-logo-full.png');

    if (fs.existsSync(ufsmLogoPath)) {
      doc.image(ufsmLogoPath, 40, 24, { height: 52 });
    }
    if (fs.existsSync(cteLogoPath)) {
      doc.image(cteLogoPath, 96, 28, { width: 90 });
    }

    doc.moveTo(194, 24).lineTo(194, 82).strokeColor('#cbd5e1').lineWidth(0.8).stroke();

    doc.font('Helvetica-Bold').fontSize(11.5).fillColor('#1e3a5f').text('UNIVERSIDADE FEDERAL DE SANTA MARIA', 204, 26);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#2563eb').text('Coordenadoria de Tecnologia Educacional - CTE', 204, 43);
    doc.font('Helvetica').fontSize(8).fillColor('#475569').text('Suporte TI | Relatório de Atendimentos', 204, 57);
    doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text(`Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`, 204, 70);

    doc.moveTo(40, 95).lineTo(555, 95).strokeColor('#cbd5e1').lineWidth(1).stroke();

    // Summary Box
    doc.rect(40, 110, 515, 55).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(10.5);
    
    const total = tickets.length;
    const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    const open = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
    
    doc.text(`Total de Chamados: ${total}`, 55, 130);
    doc.text(`Resolvidos/Encerrados: ${resolved}`, 215, 130);
    doc.text(`Em Andamento: ${open}`, 405, 130);

    // Table Header
    let y = 185;
    doc.rect(40, y, 515, 24).fill('#1e3a5f');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
    doc.text('ID', 48, y + 7);
    doc.text('TÍTULO / SOLICITANTE', 105, y + 7);
    doc.text('CATEGORIA', 310, y + 7);
    doc.text('STATUS', 415, y + 7);
    doc.text('ABERTURA', 485, y + 7);

    y += 24;

    const STATUS_LABELS_PDF = { open: 'ABERTO', in_progress: 'EM ATEND.', waiting_user: 'AGUARDANDO', resolved: 'RESOLVIDO', closed: 'ENCERRADO' };

    doc.font('Helvetica').fontSize(8);
    tickets.slice(0, 35).forEach((t, i) => {
      if (y > 740) {
        doc.addPage();
        y = 40;
      }

      const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      const rowHeight = 28;
      doc.rect(40, y, 515, rowHeight).fill(bg);

      // ID
      doc.fillColor('#334155').font('Helvetica-Bold').fontSize(8).text(`#${t.id.slice(0, 8).toUpperCase()}`, 48, y + 9);

      // Title & Requester
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8).text(t.title.slice(0, 36), 105, y + 4);
      doc.fillColor('#64748b').font('Helvetica').fontSize(7.2).text(`Por: ${t.user?.name || 'Solicitante N/A'}${t.user?.email ? ' (' + t.user.email + ')' : ''}`, 105, y + 15);

      // Category
      doc.font('Helvetica').fontSize(8).fillColor('#475569').text(t.category ? t.category.name : 'Geral', 310, y + 9);

      // Status
      const statusText = STATUS_LABELS_PDF[t.status] || t.status.toUpperCase();
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#2563eb').text(statusText, 415, y + 9);

      // Abertura
      doc.font('Helvetica').fontSize(8).fillColor('#475569').text(new Date(t.created_at).toLocaleDateString('pt-BR'), 485, y + 9);

      y += rowHeight;
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
    const closedList = tickets.filter(t => (t.status === 'resolved' || t.status === 'closed') && t.closed_at);
    const resolved = closedList.length;
    const open = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

    const resTimes = closedList.map(t => getBusinessHoursBetween(t.created_at, t.closed_at));
    const avgBusinessHours = resTimes.length > 0
      ? (resTimes.reduce((a, b) => a + b, 0) / resTimes.length).toFixed(1) + ' horas úteis'
      : 'N/A';

    sheet2.addRow({ metric: 'Período', value: `${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}` });
    sheet2.addRow({ metric: 'Total de Chamados Registrados', value: total });
    sheet2.addRow({ metric: 'Chamados Atendidos/Encerrados', value: resolved });
    sheet2.addRow({ metric: 'Chamados em Andamento', value: open });
    sheet2.addRow({ metric: 'Tempo Médio de Resolução', value: avgBusinessHours });

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
