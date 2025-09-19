const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors()); // Permite requisições do seu frontend
app.use(express.json());

// Função para formatar moeda
const formatCurrency = (value) => {
  if (value === null || value === undefined) return "";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

// Registrar um "helper" para o Handlebars usar a função
handlebars.registerHelper("formatCurrency", formatCurrency);

// Rota principal para gerar o PDF
app.post("/generate-pdf", async (req, res) => {
  try {
    // No futuro, você pegará esses dados do req.body ou de uma busca no banco
    const contractData = {
      id: 123,
      amount: 5000.0,
      duration: 12,
      // ...outros dados do contrato
    };

    const clientData = {
      name: "Maria da Silva",
      cpfCnpj: "123.456.789-00",
      rg: "12.345.678-9",
      address: {
        fullAddress:
          "Rua das Flores, 123, Bairro Jardim, São Paulo - SP, CEP 01234-567",
      },
    };

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
      clientRg: clientData.rg,
      clientAddress: clientData.address.fullAddress,
      contractAmount: contractData.amount, // Passa o valor numérico
      contractDuration: contractData.duration,
      currentDay: today.getDate(),
      currentMonth: months[today.getMonth()],
      currentYear: today.getFullYear(),
    };

    // Carregar o template HTML
    const templatePath = path.resolve(
      __dirname,
      "templates",
      "contract-template.html"
    );
    const templateHtml = fs.readFileSync(templatePath, "utf8");

    // Compilar o template com os dados
    const template = handlebars.compile(templateHtml);
    const finalHtml = template(templateData);

    // Lançar o Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"], // Necessário para rodar em ambientes de servidor
    });
    const page = await browser.newPage();

    // Definir o conteúdo da página como nosso HTML compilado
    await page.setContent(finalHtml, { waitUntil: "networkidle0" });

    // Gerar o PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    });

    await browser.close();

    // Enviar o PDF como resposta
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
