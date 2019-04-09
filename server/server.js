// IMPORTACIONES
const express = require('express')
const app = express()
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')

require('dotenv').config()


mongoose.connect(process.env.DATABASE, {useNewUrlParser: true, "useCreateIndex": true}, (err) => {
    if(err) return err
    console.log("Conectado a MongoDB");
    
})
// MIDDELWARES
app.use(express.urlencoded({extended: true}))
app.use(express.json())
app.use(cookieParser())

// MODELOS
const { User } = require('./models/user')
const { auth } = require('./middleware/auth')
const { Brand } = require('./models/brand')
const { admin } = require('./middleware/admin')
const { Wood } = require('./models/wood')
const { Product } = require('./models/product')
// RUTAS
app.post('/api/users/register', (req, res) => {
    const user = new User(req.body)
    user.save((err, doc) => {
        if(err) return res.json({success: false, err})

        res.status(200).json({
            success: true      
          })

    })
})
app.post('/api/users/login', (req, res) => {
    // 1.-ENCUENTRA EL CORREO
    User.findOne({'email': req.body.email}, (err, user) => {
        if(!user) return res.json({loginSuccess:  false, message: 'Auth fallida, email no encontrado'})
        
        // 2.- Opten el pasword y compruebalo
    user.comparePassword(req.body.password, (err, isMatch) => {
        if(!isMatch) return res.json({loginSuccess: false, message:"Password erroneo"})
    })
        // 3.- Si todo es correcto genera un token}
    user.generateToken((err, user) =>{
        if(err) return res.status(400).send(err)
        // AQUI SE GUARDA EL TOKEN COMO UN COOKIE
        res.cookie('guitarshop_auth', user.token).status(200).json(
            {loginSuccess: true}
        )

    })    
    
})
})
app.get('/api/users/auth', auth, (req, res) =>{
    res.status(200).json({
        isAdmin: req.user.role === 0 ? false : true,
        isAuth: true,
        email: req.user.email,
        name: req.user.name,
        lastname: req.user.lastname,
        role: req.user.role,
        cart: req.user.cart,
        history: req.user.history
    })

})
app.get('/api/users/logout', auth, (req, res)=> {
    User.findOneAndUpdate(
        {_id: req.user._id},
        {token: ''},
        (err, doc) => {
            if(err) return res.json({success: false, err})
            return res.status(200).json({
                success: true
            })
        }
    )
})
app.post('/api/product/brand', auth, admin, (req, res) => {
    const brand = new Brand(req.body)
    brand.save((err, doc) => {
        if(err) return res.json({success: false, err})
        res.status(200).json({
            success: true,
            brand: doc
        })
    })
})
app.get('/api/product/brands', (req, res) => {
    Brand.find({}, (err, brands) => { 
        if(err) return res.status(400).send(err)
        res.status(200).send(brands)
    })
})
app.post('/api/product/wood', auth, admin, (req, res) => {
    const wood = new Wood(req.body)
    wood.save((err,doc) => {
        if(err) return res.json({success: false, err})
        res.status(200).json({
            success: true,
            wood: doc
        })
    })

})
app.get('/api/product/woods', (req, res) => {
    Wood.find({}, (err, woods) => {
        if(err) return res.status(400).send(err)
        res.status(200).send(woods)
    }) 
})

app.post('/api/product/article', auth, admin, (req, res) =>{
    const product = new Product(req.body)
    product.save((err, doc) => {
        if(err) return res.json({success: false, err})
        res.status(200).json({
            success: true,
            article: doc
        })
    })
})

app.get('/api/product/articles_by_id', (req, res) =>{
    let type = req.query.type
    let items = req.query.id
    
    if(type === "array"){
        let ids = req.query.id.split(',')
        items = []
        items = ids.map(item => { 

            // AQUI CONVIERTO EL objetId DE MONGOOSE

            return mongoose.Types.ObjectId(item)
        })
    }
    Product.
    find({ '_id': {$in:items}})
    .populate("brand")
    .populate("wood")
    .exec((err, docs)=> {
        return res.status(200).send(docs)
    })
})
app.get('/api/product/articles', (req, res) => {

    let order = req.query.order ? req.query.order : 'asc'

    let sortBy = req.query.sortBy ? req.query.sortBy : '_id'
    let limit = req.query.limit ? parseInt(req.query.limit) : 100
    
    Product
    .find()
    .populate('brand')
    .populate('wood')    
    .sort([[sortBy, order]])
    .limit(limit)
    .exec((err, articles) => {
        
        if(err) return res.status(400).send(err)
        res.send(articles)
    })
})


const port = process.env.PORT || 3002
// LISTENERS
app.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`);
    
})