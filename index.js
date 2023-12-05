const jwt = require('jsonwebtoken')
const { ApolloServer } = require('@apollo/server')
const { startStandaloneServer } = require('@apollo/server/standalone')

const mongoose = require('mongoose')
mongoose.set('strictQuery',false)
const Book = require('./models/book')
const Author = require('./models/author')
const User = require('./models/user')
const { GraphQLError } = require('graphql')
require('dotenv').config()
const MONGODB_URI = process.env.MONGODB_URI
console.log("connecting to", MONGODB_URI);

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('connected to mongoDB')
})
.catch((error) => {
  console.log('error connection to mongoDB',error.message)
})
let authors = [
  {
    name: 'Robert Martin',
    id: "afa51ab0-344d-11e9-a414-719c6709cf3e",
    born: 1952,
  },
  {
    name: 'Martin Fowler',
    id: "afa5b6f0-344d-11e9-a414-719c6709cf3e",
    born: 1963
  },
  {
    name: 'Fyodor Dostoevsky',
    id: "afa5b6f1-344d-11e9-a414-719c6709cf3e",
    born: 1821
  },
  { 
    name: 'Joshua Kerievsky', // birthyear not known
    id: "afa5b6f2-344d-11e9-a414-719c6709cf3e",
  },
  { 
    name: 'Sandi Metz', // birthyear not known
    id: "afa5b6f3-344d-11e9-a414-719c6709cf3e",
  },
]

/*
 * Suomi:
 * Saattaisi olla järkevämpää assosioida kirja ja sen tekijä tallettamalla kirjan yhteyteen tekijän nimen sijaan tekijän id
 * Yksinkertaisuuden vuoksi tallennamme kuitenkin kirjan yhteyteen tekijän nimen
 *
 * English:
 * It might make more sense to associate a book with its author by storing the author's id in the context of the book instead of the author's name
 * However, for simplicity, we will store the author's name in connection with the book
 *
 * Spanish:
 * Podría tener más sentido asociar un libro con su autor almacenando la id del autor en el contexto del libro en lugar del nombre del autor
 * Sin embargo, por simplicidad, almacenaremos el nombre del autor en conección con el libro
*/

let books = [
  {
    title: 'Clean Code',
    published: 2008,
    author: 'Robert Martin',
    id: "afa5b6f4-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring']
  },
  {
    title: 'Agile software development',
    published: 2002,
    author: 'Robert Martin',
    id: "afa5b6f5-344d-11e9-a414-719c6709cf3e",
    genres: ['agile', 'patterns', 'design']
  },
  {
    title: 'Refactoring, edition 2',
    published: 2018,
    author: 'Martin Fowler',
    id: "afa5de00-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring']
  },
  {
    title: 'Refactoring to patterns',
    published: 2008,
    author: 'Joshua Kerievsky',
    id: "afa5de01-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring', 'patterns']
  },  
  {
    title: 'Practical Object-Oriented Design, An Agile Primer Using Ruby',
    published: 2012,
    author: 'Sandi Metz',
    id: "afa5de02-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring', 'design']
  },
  {
    title: 'Crime and punishment',
    published: 1866,
    author: 'Fyodor Dostoevsky',
    id: "afa5de03-344d-11e9-a414-719c6709cf3e",
    genres: ['classic', 'crime']
  },
  {
    title: 'The Demon ',
    published: 1872,
    author: 'Fyodor Dostoevsky',
    id: "afa5de04-344d-11e9-a414-719c6709cf3e",
    genres: ['classic', 'revolution']
  },
]

/*
  you can remove the placeholder query once your first one has been implemented 
*/

const typeDefs = `
  type Authors{
    name: String!
    born: Int
    bookCount: Int
    id: ID
  }
  type Books{
    title: String!
    author: Authors!
    published: Int!
    genres: [String!]!
    id: ID!
  }
  type User {
  username: String!
  favoriteGenre: String!
  id: ID!
  }
  type Token {
  value: String!
  }
  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author:String, genre:String): [Books]
    allAuthors: [Authors!]!
    me: User
  }
  type Mutation {
    addAuthor(
      name: String!
      born: Int
    ):Authors
    addBook(
      title: String!
      author: String!
      published: Int!
      genres: [String!]!
    ):Books
    editAuthor(
      name: String!
      setBornTo: Int!
    ):Authors
    createUser(
    username: String!
    favoriteGenre: String!
  ): User
  login(
    username: String!
    password: String!
  ): Token
  }
`;

const resolvers = {
  Mutation:{
    addBook: async (root,args,{currentUser}) => {
      if (!currentUser) {
        throw new GraphQLError('not authenticated', {
          extensions: {
            code: 'BAD_USER_INPUT',
          }
        })
      }
     try{
       const checkAuthorExistsinDB = await Author.exists({ name:args.author })
      console.log(checkAuthorExistsinDB)
      if(!checkAuthorExistsinDB){
        const author = new Author({ name: args.author,born:null })
        const savedAuthor = await author.save()
        const book = new Book({ ...args, author: savedAuthor._id})
        const savedBook = await book.save()
        return savedBook.populate('author')
      }
      const book = new Book({ ...args, author: checkAuthorExistsinDB})
      const savedBook = await book.save()
      return savedBook.populate('author')
     }catch(error){
      console.log('error')
      throw new GraphQLError('creating the book failed',{
        extensions: {
          code: 'BAD_USER_INPUT',
          invalidArgs: args.title
        }
      })
     }
    },
    addAuthor: async(root,args,{currentUser}) => {
      const author = new Author({...args})
      if (!currentUser) {
        throw new GraphQLError('not authenticated', {
          extensions: {
            code: 'BAD_USER_INPUT',
          }
        })
      }
      try{
        return author.save()
      }catch (error) {
        console.log('error')
        throw new GraphQLError('Creating author failed', {
          extensions: {
            code: 'BAD_USER_INPUT',
            invalidArgs: args.name,
            error
          }
        })
      }
    },
    editAuthor: async(root,args,{currentUser}) => {
      if (!currentUser) {
        throw new GraphQLError('not authenticated', {
          extensions: {
            code: 'BAD_USER_INPUT',
          }
        })
      }
      const checkAuthorExistsinDB = await Author.exists({ name:args.name })
      console.log(JSON.parse(JSON.stringify(checkAuthorExistsinDB)))
      console.log('edit mutation')
      if(!checkAuthorExistsinDB){
        return null
      }
      else{
        console.log('trying to modify')
        const updatedAuthor = await Author.findByIdAndUpdate(JSON.parse(JSON.stringify(checkAuthorExistsinDB)),{born:args.setBornTo},{new:true})
        console.log(updatedAuthor)
        return updatedAuthor
      }
    },
    createUser: async (root,args) => {
      console.log(args)
      const user = new User({...args})
      return user.save().catch(error=> {
        throw new GraphQLError('Creating User failed',{
          extensions:{
            code: 'BAD_USER_INPUT',
            invalidArgs: args.username,
            error
          }
        })
      })
    },
    login: async(root,args) => {
      const user = await User.findOne({username:args.username})
      console.log(user)
      if ( !user || args.password !== 'secret' ) {
      throw new GraphQLError('wrong credentials', {
        extensions: {
          code: 'BAD_USER_INPUT'
        }
      })        
    }

    const userForToken = {
      username: user.username,
      id: user._id,
    }

    return { value: jwt.sign(userForToken, process.env.JWT_SECRET) }
    },
  },
  Query: {
    me: (root, args, context) => {return context.currentUser},
    bookCount: async() => Book.collection.countDocuments(),
    authorCount: async() => Author.collection.countDocuments(),
    allBooks: async(root,args) => {
      console.log('allbooks',args)
      if(!args.author && !args.genre){
        console.log('nully')
        const book = await Book.find({}).populate('author')
        return book
      }
      else if(!args.genre){
        console.log('else if only author',args.author)
        const book = await Book.find().populate('author')
        // console.log(book)
        return book.filter(b=>b.author.name === args.author)
        // return books.filter((book) => book.author === args.author || book.genres.includes(args.genre))
      }
      else if(!args.author){
        console.log('else if only genre')
        const book = await Book.find({}).populate('author')
        // console.log(book.filter(b=>b.genres.includes(args.genre)))
        return book.filter(b=>b.genres.includes(args.genre))
      }
      else{
        const book = await Book.find({}).populate('author')
        return book.filter(b=>(b.author.name === args.author && b.author.name === args.author))
      }
      //8.4
      
    },
    allAuthors: async() => {
      return Author.find({})
    }
  },
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
})

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req, res }) => {
    const auth = req ? req.headers.authorization : null
    if (auth && auth.startsWith('Bearer ')) {
      const decodedToken = jwt.verify(
        auth.substring(7), process.env.JWT_SECRET
      )
      const currentUser = await User
        .findById(decodedToken.id)
        console.log('this iscurrentUser',currentUser)
      return { currentUser }
    }
  },
}).then(({ url }) => {
  console.log(`Server ready at ${url}`)
})