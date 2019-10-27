const { send, sendError } = require( 'micro' )

module.exports = async ( req, res ) => {
  try {
    send(res, 200, 'data' )
  } catch ( error ) {
    console.log( 'err', error )
    sendError(req, res, error)
  }
}
