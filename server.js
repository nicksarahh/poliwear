const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');
const { body, validationResult } = require('express-validator'); // Para validação

const app = express();

// Configurações do app
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  key: 'sessao_cookie',
  secret: 'as-tapadas',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Use true em produção com HTTPS
}));

// Middleware para verificar autenticação
function authMiddleware(req, res, next) {
  if (!req.session.loggedin) {
    return res.redirect('/login.html');
  }
  next();
}

// Configuração do Multer para upload de arquivos
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Conexão com o banco de dados MySQL
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DBNAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Teste de conexão
db.getConnection()
  .then(() => console.log('Conexão com o banco estabelecida.'))
  .catch((err) => console.error('Falha na conexão com o banco:', err));

// Rota para a página de login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Rota de cadastro de usuário
app.post('/cadastro', async (req, res) => {
  const { rm, turma, prim_nome, ult_nome, email, senha, confirm_senha } = req.body;

  // Verificação das senhas
  if (senha !== confirm_senha) {
    return res.status(400).send('As senhas não coincidem!');
  }

  try {
    // Verificar se o RM já está cadastrado
    const [rows] = await db.query('SELECT * FROM usuarios WHERE rm = ?', [rm]);

    if (rows.length > 0) {
      return res.status(400).send('Usuário já cadastrado!');
    }

    // Criptografar a senha
    const hashedPassword = await bcrypt.hash(senha, 10);

    // Inserir novo usuário no banco de dados
    const result = await db.query(
      'INSERT INTO usuarios (rm, turma, prim_nome, ult_nome, email, senha) VALUES (?, ?, ?, ?, ?, ?)',
      [rm, turma, prim_nome, ult_nome, email, hashedPassword]
    );

    console.log('Usuário cadastrado com ID:', result.insertId); // Log para ver o ID gerado
    return res.status(200).send('Usuário cadastrado com sucesso!');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err.message); // Inclua o detalhe do erro
    return res.status(500).send('Erro no servidor!');
  }
});


// Rota de login
app.post('/login', async (req, res) => {
  const { rm, senha } = req.body;

  try {
    // Verificar se o usuário existe
    const [rows] = await db.query('SELECT * FROM usuarios WHERE rm = ?', [rm]);

    if (rows.length === 0) {
      return res.status(400).send('Usuário não encontrado!');
    }

    const usuario = rows[0];

    // Verificar a senha
    const match = await bcrypt.compare(senha, usuario.senha);
    if (!match) {
      return res.status(400).send('Senha incorreta!');
    }

    // Armazenar dados na sessão
    req.session.loggedin = true;
    req.session.firstName = usuario.prim_nome;
    req.session.rm = usuario.rm; // Armazenar RM na sessão

    console.log('Sessão após login:', req.session); // Verificar a sessão após o login

    // Redirecionar para a tela inicial
    return res.redirect('/telainicial.html');
  } catch (err) {
    console.error('Erro ao fazer login:', err);
    return res.status(500).send('Erro no servidor!');
  }
});

// Rota para a tela inicial
app.get('/telainicial.html', (req, res) => {
  if (req.session.loggedin) {
    res.sendFile(path.join(__dirname, 'public', 'telainicial.html'));
  } else {
    res.redirect('/login.html');
  }
});

// Rota para o perfil do usuário
app.get('/perfil', (req, res) => {
  if (!req.session.loggedin) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const rm = req.session.rm; // Assumindo que o RM do usuário está salvo na sessão
  const query = 'SELECT rm, nome_completo, turma, email, imagem_perfil FROM usuarios WHERE rm = ?';

  db.query(query, [rm], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar os dados do usuário' });
    }

    if (results.length > 0) {
      const user = results[0];
      // Converte a imagem (LONGBLOB) em Base64
      let imagemBase64 = null;
      if (user.imagem_perfil) {
        imagemBase64 = user.imagem_perfil.toString('base64');
      }

      res.json({
        rm: user.rm,
        nome_completo: user.nome_completo,
        turma: user.turma,
        email: user.email,
        imagem_perfil: imagemBase64, // Inclui a imagem como Base64
      });
    } else {
      res.status(404).json({ error: 'Usuário não encontrado' });
    }
  });
});


// Rota para upload de imagem de perfil
app.post('/upload', upload.single('file'), async (req, res) => {
  const imagem = req.file.buffer;
  const rm = req.session.rm; // RM do usuário logado

  try {
      await db.query('UPDATE usuarios SET imagem_perfil = ? WHERE rm = ?', [imagem, rm]);
      res.json({ message: 'Imagem salva com sucesso!' });
  } catch (err) {
      console.error('Erro ao salvar a imagem:', err);
      res.status(500).json({ message: 'Erro ao salvar a imagem.' });
  }
});

// Rota para obter dados do usuário
app.get('/getUser', (req, res) => {
  if (req.session.loggedin) {
    res.json({ prim_nome: req.session.firstName }); // Retornar o nome do usuário
  } else {
    res.sendFile(path.join(__dirname, 'public', 'telainicial.html'));
  }
});


// Rota para adicionar item ao carrinho
app.post('/adicionarCarrinho', async (req, res) => {
  const { titulo, preco, tamanho, cor, quantidade, imagem, nome_camiseta, num_camiseta } = req.body;
  const rm = req.session.rm; // Pegando o RM da sessão

  if (!rm) {
      return res.redirect('/login.html')
  }

  // SQL query para inserir os dados no banco de dados, incluindo o caminho da imagem
  const query = `INSERT INTO carrinho (titulo, preco, tamanho, cor, quantidade, rm, imagem, nome_camiseta, num_camiseta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  try {
      await db.query(query, [titulo, preco, tamanho, cor, quantidade, rm, imagem, nome_camiseta, num_camiseta]);
      console.log('Produto adicionado ao carrinho com sucesso!');
      return res.status(200).send('Produto adicionado ao carrinho com sucesso!');
  } catch (err) {
      console.error('Erro ao inserir produto no carrinho:', err);
      return res.status(500).send('Erro ao adicionar produto ao carrinho.');
  }
});



// Rota para visualizar carrinho
app.get('/carrinho', async (req, res) => {
  const rm = req.session.rm; // Obtém o RM da sessão

  if (!rm) {
    return res.redirect('/login.html');
  }

  const query = 'SELECT * FROM carrinho WHERE rm = ?';
  
  try {
    const [results] = await db.query(query, [rm]);

    // Calcula o total somando o subtotal (preço * quantidade) de cada item
    const total = results.reduce((acc, item) => acc + (item.preco * item.quantidade), 0).toFixed(2);

    res.render('carrinho', { itens: results, total });
  } catch (err) {
    console.error('Erro ao buscar itens do carrinho:', err);
    return res.status(500).send('Erro ao buscar itens do carrinho');
  }
});


app.post('/remover-produto', async (req, res) => {
  const produtoId = req.body.produto_id;

  try {
    const [result] = await db.query('DELETE FROM carrinho WHERE id = ?', [produtoId]);

    if (result.affectedRows === 0) {
      console.log('Produto não encontrado no carrinho!');
    }

    console.log('Produto excluído com sucesso:', produtoId);
    res.redirect('/carrinho'); // Redireciona para a página do carrinho após a exclusão
  } catch (err) {
    console.error('Erro ao excluir produto:', err);
    return res.status(500).send('Erro no servidor!');
  }
});


app.post('/concluirPedido', async (req, res) => {
  const rm = req.session.rm;  // Supondo que o RM do usuário esteja na sessão

  if (!rm) {
    return res.redirect('/login.html')
  }

  try {
    // Inserir os pedidos na tabela pedidos primeiro
    const inserirPedidosQuery = `
      INSERT INTO pedidos (rm, titulo, preco, tamanho, cor, quantidade, imagem)
      SELECT rm, titulo, preco, tamanho, cor, quantidade, imagem
      FROM carrinho
      WHERE rm = ?`;

    console.log('Inserindo pedidos para RM:', rm);

    // Executando a inserção com await
    await db.execute(inserirPedidosQuery, [rm]);
    console.log('Pedidos inseridos com sucesso');

    // Após inserir, excluir os pedidos da tabela carrinho
    const excluirCarrinhoQuery = 'DELETE FROM carrinho WHERE rm = ?';
    await db.execute(excluirCarrinhoQuery, [rm]);
    console.log('Carrinho excluído com sucesso');

    // Redirecionar para a página finalizar.html
    res.redirect('/finalizar.html');
  } catch (err) {
    console.log('Erro ao concluir pedido:', err.message);
  }
});

// Rota para servir o arquivo HTML (finalizar.html)
app.get('/finalizar.html', (req, res) => {
  res.sendFile(__dirname + '/finalizar.html');
});





app.get('/rastreio', async (req, res) => {
  const rm = req.session.rm; // Obtém o RM da sessão

  if (!rm) {
    return res.redirect('/login.html');
  }

  const query = 'SELECT * FROM pedidos WHERE rm = ?';
  
  try {
    const [results] = await db.query(query, [rm]);


    res.render('rastreio', { itens: results});
  } catch (err) {
    console.error('Erro ao buscar itens do carrinho:', err);
    return res.status(400).send('Erro ao buscar itens do carrinho');
  }
});

app.post("/excluir-rastreio", (req, res) => {
  const rm = req.session.rm;

    if (!rm) {
        return res.redirect('/login.html')
    }

    const deleteQuery = 'DELETE FROM pedidos WHERE rm = ?';

    db.query(deleteQuery, [rm], (error, results) => {
        if (error) {
            console.error(error);
        }
        res.render('rastreio', { message: 'Obrigado pela compra!' });
    });
    
});



// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
