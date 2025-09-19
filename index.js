const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const formatCurrency = (value) => {
  if (value === null || value === undefined) return "";
  // Garante que o valor é tratado como número antes de formatar
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

handlebars.registerHelper("formatCurrency", formatCurrency);

app.post("/generate-pdf", async (req, res) => {
  try {
    // **CORREÇÃO AQUI: Usar os dados do corpo da requisição**
    const { contractData, clientData } = req.body;

    // Validação para garantir que os dados necessários foram recebidos
    if (!contractData || !clientData || !clientData.name) {
      return res
        .status(400)
        .send({
          error: "Dados do contrato ou do cliente ausentes ou inválidos.",
        });
    }

    const today = new Date();
    const months = [
      "janeiro",
      "fevereiro",
      "março",
      "abril",
      "maio",
      "junho",
      "julho",
      "agosto",
      "setembro",
      "outubro",
      "novembro",
      "dezembro",
    ];

    const templateData = {
      clientName: clientData.name.toUpperCase(),
      clientCpfCnpj: clientData.cpfCnpj,
      clientRg: clientData.rg, // Será nulo se não vier, e o template Handlebars vai lidar com isso
      clientAddress: clientData.address.fullAddress,
      contractAmount: contractData.amount,
      contractDuration: contractData.duration,
      currentDay: today.getDate(),
      currentMonth: months[today.getMonth()],
      currentYear: today.getFullYear(),
    };

    const templatePath = path.resolve(
      __dirname,
      "templates",
      "contract-template.html"
    );
    const templateHtml = fs.readFileSync(templatePath, "utf8");
    const template = handlebars.compile(templateHtml);
    const finalHtml = template(templateData);

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    await page.setContent(finalHtml, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=contrato-${contractData.id}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    res.status(500).send("Ocorreu um erro ao gerar o contrato em PDF.");
  }
});

app.listen(PORT, () => {
  console.log(`Serviço de PDF rodando na porta ${PORT}`);
});
