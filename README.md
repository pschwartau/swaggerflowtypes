take the [models](https://github.com/swagger-api/swagger-core/wiki/Annotations#apimodel) from your [swagger api](https://github.com/swagger-api/swagger-spec) and create [type aliases](http://flowtype.org/docs/objects.html#reusable-object-types) for the [facebook flow typechecker](http://flowtype.org/docs/getting-started.html#_)

**usage:**

just invoke `swaggerflowtypes <the url to your api-docs json`

```
$ > npm install -g swaggerflowtypes
$ > swaggerflowtypes http://192.168.59.103/api-docs
type User = {id: string, name: string};
type Device = {id: string, user_ID: string, phoneNumber: string};
```

