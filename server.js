const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const path = require('path');
const app = express();

// Configurações
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'novatech_secret_key',
    resave: false,
    saveUninitialized: true
}));

// Inicialização do Banco de Dados
const db = new sqlite3.Database('./database.db');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, password TEXT, role TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS tickets (id INTEGER PRIMARY KEY, title TEXT, description TEXT, status TEXT, priority TEXT, user_id INTEGER, feedback INTEGER)`);
    
    // Usuários iniciais para teste
    db.run(`INSERT OR IGNORE INTO users VALUES (1, 'Admin NovaTech', 'admin@nova.tech', '123', 'admin')`);
    db.run(`INSERT OR IGNORE INTO users VALUES (2, 'Gabriel Santana', 'gabriel@teste.com', '123', 'user')`);
});

// Rotas de Login
app.get('/', (req, res) => res.render('login'));
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, user) => {
        if (user) {
            req.session.user = user;
            res.redirect(user.role === 'admin' ? '/admin' : '/dashboard');
        } else {
            res.send('Acesso Negado');
        }
    });
});

// Dashboard Usuário (Abrir e Ver Chamados)
app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    db.all('SELECT * FROM tickets WHERE user_id = ?', [req.session.user.id], (err, rows) => {
        res.render('dashboard-user', { user: req.session.user, tickets: rows });
    });
});

app.post('/ticket/new', (req, res) => {
    const { title, description, priority } = req.body;
    db.run('INSERT INTO tickets (title, description, status, priority, user_id) VALUES (?, ?, "Aberto", ?, ?)', 
    [title, description, priority, req.session.user.id], () => res.redirect('/dashboard'));
});

// Dashboard Admin (Gerenciar Chamados)
app.get('/admin', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/');
    db.all('SELECT tickets.*, users.name FROM tickets JOIN users ON tickets.user_id = users.id', (err, rows) => {
        res.render('dashboard-admin', { user: req.session.user, tickets: rows });
    });
});

app.post('/ticket/update', (req, res) => {
    const { id, status } = req.body;
    db.run('UPDATE tickets SET status = ? WHERE id = ?', [status, id], () => res.redirect('/admin'));
});

app.listen(3000, () => console.log('Servidor NovaTech rodando em http://localhost:3000'));