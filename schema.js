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
    genreList: [String!]!
    reccoBooks: [Books]
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
  type Subscription {
    bookAdded: Books!
  }
`
module.exports = typeDefs