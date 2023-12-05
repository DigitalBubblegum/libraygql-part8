const { v1: uuid } = require('uuid')
const { ApolloServer } = require('@apollo/server')
const { startStandaloneServer } = require('@apollo/server/standalone')

const mongoose = require('mongoose')
mongoose.set('strictQuery',false)
const Book = require('./models/book')
const Author = require('./models/author')
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
  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author:String, genre:String): [Books]
    allAuthors: [Authors!]!
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
  }
`

const resolvers = {
  Mutation:{
    addBook: async (root,args) => {
      const checkAuthorExistsinDB = await Author.exists({ name:args.author })
      const book = new Book({ ...args, author: checkAuthorExistsinDB})
      const savedBook = await book.save()
      return savedBook.populate('author')
    },
    addAuthor: async(root,args) => {
      const author = new Author({...args})
      return author.save()
    },
    editAuthor: (root,args) => {
      const author = authors.find(author => author.name === args.name)
      console.log(args)
      console.log('edit mutation')
      if(!author){
        return null
      }
      const updatedAuthor = {...author,born:args.setBornTo,bookCount: books.filter(book => book.author === author.name).length,}
      console.log('updated',updatedAuthor)
      authors = authors.map(author => author.name === args.name ? updatedAuthor : author)
      return updatedAuthor
    }
  },
  Query: {
    bookCount: async() => Book.collection.countDocuments(),
    authorCount: async() => Author.collection.countDocuments(),
    allBooks: (root,args) => {
      console.log('allbooks',args)
      if(!args.author && !args.genre){
        console.log('nully')
        return books
      }
      else{
        console.log('else')
        return books.filter((book) => book.author === args.author || book.genres.includes(args.genre))
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
}).then(({ url }) => {
  console.log(`Server ready at ${url}`)
})