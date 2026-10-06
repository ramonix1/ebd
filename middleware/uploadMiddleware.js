const multer = require('multer');

const MAX_FOTO_BYTES = 2 * 1024 * 1024; // 2MB
const MIMES_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

// A foto fica em memória (req.file.buffer) e é gravada no PostgreSQL pelo
// controller: o disco do Render é efêmero.
const storage = multer.memoryStorage();

// Validação de arquivo
const fileFilter = (req, file, cb) => {
  if (MIMES_PERMITIDOS.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const erro = new Error('Apenas imagens (JPEG, PNG, WEBP) são permitidas');
    erro.status = 400;
    cb(erro, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FOTO_BYTES, files: 1 },
});

// Converte erros do multer (ex.: arquivo grande demais) em erros 4xx amigáveis.
function traduzirErro(erro) {
  if (erro && erro.name === 'MulterError') {
    erro.status = 400;
    if (erro.code === 'LIMIT_FILE_SIZE') {
      erro.message = 'A imagem deve ter no máximo 2MB';
    }
  }
  return erro;
}

module.exports = {
  single: (campo) => (req, res, next) =>
    upload.single(campo)(req, res, (erro) => next(erro ? traduzirErro(erro) : undefined)),
  MAX_FOTO_BYTES,
  MIMES_PERMITIDOS,
};
