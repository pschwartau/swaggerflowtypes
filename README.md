take the [models](https://github.com/swagger-api/swagger-core/wiki/Annotations#apimodel) from your [swagger api](https://github.com/swagger-api/swagger-spec) and create [type aliases](http://flowtype.org/docs/objects.html#reusable-object-types) for the [facebook flow typechecker](http://flowtype.org/docs/getting-started.html#_)

**usage:**

just invoke `swaggerflowtypes -o <output_dir> <the_url_to_your_api-docs_json>`

```
$ > npm install -g swaggerflowtypes
$ > swaggerflowtypes -o types http://`boot2docker ip`/api-docs
wrote to types/User.js
wrote to types/Device.js
```

Currently because of [this issue]('https://github.com/facebook/flow/issues/16')
in order to import these types in your code, you have to require the file for the type as follows.

` var User = require('./types/User'); `

Then you can refer to the type normally eg:

`foo(user: User): void`

