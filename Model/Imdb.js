const request	=	require('request');

module.exports = class Imdb
{
	getById(id)
	{
		return new Promise((resolve, reject) => {
			request.post("http://omdbapi.com/api?Apikey=yDDM2vEeZKyhBkypTsrgUUuOavQ4z8&i=" + id, function (err, response, body) {
				if (err) throw console.log(err);
				resolve(JSON.parse(body));
			});
		});
	}
}
