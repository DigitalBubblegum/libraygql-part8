const jwt = require('jsonwebtoken')
const Book = require('./models/book')
const Author = require('./models/author')
const User = require('./models/user')
const { GraphQLError } = require('graphql')
const { PubSub } = require('graphql-subscriptions')
const author = require('./models/author')
const pubsub = new PubSub()

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
        let savedBook = await book.save()
        savedBook = savedBook.populate('author')
        console.log('book',savedBook)
        pubsub.publish('BOOK_ADDED',{bookAdded : savedBook})
        return savedBook
      }
      const book = new Book({ ...args, author: checkAuthorExistsinDB})
      let savedBook = await book.save()
      savedBook = savedBook.populate('author')
      console.log('book',savedBook)
      pubsub.publish('BOOK_ADDED',{bookAdded : savedBook})
      return savedBook
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
  Subscription: {
    bookAdded: {
        subscribe: () => pubsub.asyncIterator('BOOK_ADDED')
    }
  },
  Query: {
    reccoBooks: async(root, args,{currentUser})=>{
      const books = await Book.find().populate('author')
      const bookReccomendations = books.filter(book=>book.genres.includes(currentUser.favoriteGenre))
      // console.log('in query reccobooks favorite genre is ',bookReccomendations)
      return bookReccomendations
    },
    genreList: async(root, args) => {
      const books = await Book.find().populate('author')
      const genres = []
      books.map((book) => {
        book.genres.forEach((element) => {
          if (genres.includes(element)) {
            null;
          } else {
            genres.push(element);
          }
        });
      });
      return genres
    },
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
    allAuthors: async(root,args) => {
      const books = await Book.find({}).populate('author')
      const authors = await Author.find({})
      return authors.map(author => ({
        name: author.name,
        born: author.born,
        bookCount: books.filter(book=>book.author.name === author.name).length,
        id: author.id
      }))
    }
  },
}
module.exports = resolvers