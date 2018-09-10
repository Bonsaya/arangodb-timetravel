## ArangoDB Timetravel

### Introduction

Your application requires analysis of data changes over time, you need to know how the state of your data was at some point in time or you install mission critical systems that could benefit from diagnosis by taking a closer look at the before and after?

With ArangoDB Timetravel* you can seamlessly traverse all states of your data over time and design your own introspection to analyse the data and the performance of your systems over time. All states of data remain permanently stored in ArangoDB and all of that hassle free, using some powerfully designed <a href="https://bonsaya.com" target="_blank">Bonsaya&#8482;</a> magic.

Not a fan of a text explaining how powerful a system may be for you or simply want to see how this could be used? Let's provide some examples...

> *Please keep in mind that ArangoDB Timetravel only works inside Foxx currently(but it should be easily ported to arangojs).

### Example

##### Airplane Maintenance

Let's say your company is in charge of maintenance for a large airline. You regularly check the airplanes and their components and when malfunctions can be detected, you swap out the necessary components to ensure proper function of all airplanes and safe travels for their customers. Here is an example of how this could look like:

| Maintenance | Airplane | Navigation | Fuel Engine |
| :-----------: | :--------: | :------: | :------: |
| 1st. Jan 17   | Boeing 747 | NAV 3741 | JET 0412 | 
| 1st. Feb 17   | Boeing 747 | NAV 2131 | JET 0412 | 
| 1st. March 17 | Boeing 747 | NAV 2131 | JET 0412 | 

A malfunction in January caused the navigation component to have to be swapped out, as can be seen by the ID of the navigation component changing inside the table. What kind of questions may we ask ourselves now?

**What is the lifetime of each NAV system?**

We look back in time and see how long each of the navigation systems have been in use for for each of our airplanes.

**How many other airplanes are using or have been using NAV 3741?**

We look at each of our airplanes and consider also the previous components installed into them and check if maybe we have other airplanes suffering from the same problem by analysing if the components have been swapped out there too.

**How often do we need to swap out navigation components on our airplane?**

By looking back in time at the average lifecycle of the components, we can deduce what component has the longest lifetime, save money and predict ahead of time when new components are needed.

And these are just one of so unbelievably many use-cases for this technology!

### Usage

I know what you must be thinking right about now: "But I have to develop a system that can keep track of these changes over time and restore the old states!". I am glad you asked, this is exactly what *ArangoDB TimeTravel does.*

It is so easy your development team is going to love it! And if you're a developer reading this, I am sure you'll appreciate this one!

##### Installation

Simply run the following command:

```bash
npm install arangodb-timetravel --save
```

##### Invocation

Add the following to any script requiring timetravel functionality:

```javascript
// Import ArangoDB DB
const db = require('@arangodb').db;
// Default settings, you may change this if you wish!
const settings = {
	presentAppendix: '__PRESENT',
	pastAppendix: '__PAST',
	edgeAppendix: '__EDGE',
	proxy: {
		outboundAppendix: '__OUTBOUND',
		inboundAppendix: '__INBOUND'
	}
};
// Import the timetravel framework from us!
const timetravel = require("arangodb-timetravel")(db, settings);
```

and start creating!

```javascript
if (!timetravel.collection('customers')) {
	const customers = timetravel.createDocumentCollection('customers');
	[
		{
			_key: 'Customer',
			firstname: "Kevin",
			lastname: "Sekin",
		}
	].forEach((customer) => {
		customers.insert(customer);
	});
}
```

And you're set. Don't believe me? Well let's update the *customer* we just created above.

```javascript
customers.update("Customer", {
	updated: true	
});
```

Oh no! We want to go back in time now to the previous customer? Watch this!

```javascript
let customer = customers.document("Customer");
let previous = customers.previous("Customer", customer);
```

Want to see the entire history?
```javascript
let history = customers.history("Customer");
```

As you can see, this is extremely powerful! But it gets better because:
* **It comes with all functionality of ArangoDB, including graphs!**
* **The functions match the functions of Foxx 1:1, no confusion or reading a lot of documentation!**

So what are you waiting for?

### Limitations

Because it is impossible to predict the scope of all necessary functionality, including all necessary queries that may arise, developers are required to understand how the collections are built under the hood. I assure you, it is quite simple to understand! This will allow you to build custom queries if your needs are more demanding. Most simple needs should be covered by the framework already!

### Documentation

A detailed documentation will be coming shortly! For now, please take a look at the source code. It is minimal and heavily documented on purpose and should make it easy! Remember, all of the functions match <a href="https://docs.arangodb.com/devel/Manual/DataModeling/Documents/DocumentMethods.html">ArangoDB's functionality</a>.

### Contribution

As you can imagine, developing all of this took a lot of time. At the time of release, I, Kevin Sekin, am the sole developer of this framework. However my company <a href="https://bonsaya.com" target="_blank">Bonsaya&#8482;</a> will maintain this framework with **Arne Winter** our Lead of Research and Development at the helm of it all.

That is why we require your help! This framework sets the foundation for meaningful and complex services and aids developers worldwide provide complex, timetravel-able, mission critical systems in health, manufacturing and services. With your contribution, you will help developers keep their mission critical systems running smoothly and ensure better implementations worldwide. Any and all help is deeply appreciated. Feel free to fork and make as many pull requests as your heart desires.

However, I'd like to mention that I will keep a close eye on all contributions through pull requests and I will only accept actual, useful, improvements. I don't want this framework to get cluttered with edge-cases that may not be useful to anyone else. It is supposed to be kept lightweight. Thank you for your understanding.

Of course I'd be very happy if you provide some credits in your applications if you feel so inclined!

### License

Copyright 2018 Kevin 'Extremo' Sekin

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.