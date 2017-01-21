const DATE_OF_DENOMINATION = new Date("2016-07-01");//the date of denomination, the constants
const DAY_OF_DENOMINATION = Math.floor(DATE_OF_DENOMINATION.getTime()/(1000*60*60*24));// we find a day since zero point
var WalletsIdH = {}; // the object with fields {name: ObjectID} for binding with transaction collection
var friendsNamesIdH = {}; // the object with fields{name: ObjectID} for the friends database

function standartDate(anyDay){// this function normalize string date into a Date object

    var anyDayA = anyDay.split("/");// we have got an array of 3 numbers in a string type
    
    var anyDATE = new Date();
        anyDATE.setFullYear(anyDayA[2]);// A means Array
        anyDATE.setMonth(anyDayA[0]-1);// we have months in range of 0...11
        anyDATE.setDate(anyDayA[1]);// anyDATE is in a correct format
        // we use format m/y/dddd

    
    return anyDATE;

}

function findWallet(name){
    // we find the _id field of the wallet with the certain name
    var Cursor = db.wallets.find({"name": name}).toArray();
    var Element = Cursor[0];
    WalletsIdH[name] = Element['_id'];// we store ObjectID from the database into the hash
}

function writeFriends(name){
    db.friends.insert({"name": name});
    var Cursor = db.friends.find({"name": name}).toArray();
    var Element = Cursor[0];
    friendsNamesIdH[name] = Element['_id'];
}// we create friends collection

function dataRates(){
    var ratesdbH = db.rates.find().toArray();// we accept it from the DB
    var len = ratesdbH.length;// the length of our array
    var timeDay;
    var ratesH = {};// we create a new object
    dataA = []; rateA = []; standartDateA = [];
    rateInDaysA = []; // we use this array to put rates. A number in [] brackets is the number of the day since zero point 1970
    for(var i = 0; i<len; i++){
        dataA[i] = ratesdbH[i].date;
        rateA[i] = ratesdbH[i].rate;
        standartDateA[i] = standartDate(dataA[i]);
        
        timeDay = Math.floor(standartDateA[i].getTime()/(1000*60*60*24));// we find a day since zero point
        rateInDaysA[timeDay] = rateA[i];
        // print("timeDay = " + timeDay);
        // print("rateInDaysA[timeDay] = "+ rateInDaysA[timeDay])
    }
    ratesH.data = dataA;
    ratesH.rateInDays = rateInDaysA;
    //ratesH.rate = rateA;
    ratesH.standartDate = standartDateA;
    return ratesH;
}

var ratesH = dataRates();// we have all data from DB in ratesH

function findStartData(ratesH){
    var dataA = ratesH.data;// the array with string data
    var standartDateA = ratesH.standartDate; //we have the array
    var min = standartDateA[0].getTime();
    var cycleTime;
    var num = 0;
    var len = standartDateA.length;
    for(var i=0; i<len; i++){
        cycleTime = standartDateA[i].getTime();
        if (cycleTime < min){
            min = cycleTime;
            num = i;
        } 
    }
    return dataA[num];
}

function findFinishData(ratesH){
    var dataA = ratesH.data;// the array with string data
    var standartDateA = ratesH.standartDate; //we have the array
    var max = standartDateA[0].getTime();
    var cycleTime;
    var num = 0;
    var len = standartDateA.length;
    for(var i=0; i<len; i++){
        cycleTime = standartDateA[i].getTime();
        if (cycleTime > max){
            max = cycleTime;
            num = i;
        } 
    }
    return dataA[num];
}

function calculateCashDelta(nowTimeDay){
    // cashbox is a result of the daily transactions
    // let cashboxA = [];
    // let cashboxA[0] = Byr, cashboxA[1] = Byn, cashboxA[2] = USD
    var nowData = new Date();
    nowData.setTime(nowTimeDay*1000*60*60*24);
    var cashboxA = [];//0 - Byr, 1 - Byn, 2 - USD, 3 - PurseByr, 4 - CardByr for the correct transfer at the denomination date
    cashboxA[0] = 0; cashboxA[1] = 0; cashboxA[2] = 0; cashboxA[3] = 0; cashboxA[4] = 0;
    var i = 0,
    TypeA = [],
    OperationNameA = [],
    AmountA = [],
    CurrencyA = [],
    AccountA = [],
    cursor = db.transactions.find({"Date": nowData}),
    length;
        cursor.forEach(
            function(obj){
                TypeA[i] = obj.Type;// we find certain field of the certain transaction
                OperationNameA[i] = obj.OperationName;
                AmountA[i] = obj.Amount;
                CurrencyA[i] = obj.Currency;
                AccountA[i] = obj.Account;// we need to know the account to correctly make transfer at the denomination date
                i++;
            }
        );
        length = TypeA.length;
        if(length>0){
            for(var j = 0; j<length; j++){
                switch(CurrencyA[j]){
                    case "Byr":
                        if(TypeA[j] === "Exp"){
                            cashboxA[0] = cashboxA[0] - AmountA[j];
                            if(AccountA[j] === "PurseByr"){
                                cashboxA[3] = cashboxA[3] - AmountA[j];
                            }
                            else{
                                cashboxA[4] = cashboxA[4] - AmountA[j];
                            }
                            // we calculate the cashboxA for the PurseByr or for the CardByr
                            // Byr cashboxA[0] don't care about the PurseByr or CardByr account it is just Byr
                        }
                        else{
                            cashboxA[0] = cashboxA[0] + AmountA[j];
                            if(AccountA[j] === "PurseByr"){
                                cashboxA[3] = cashboxA[3] + AmountA[j];
                            }
                            else{
                                cashboxA[4] = cashboxA[4] + AmountA[j];
                            }
                            // we calculate the cashboxA for the PurseByr or for the CardByr
                            // Byr cashboxA[0] don't care about the PurseByr or CardByr account it is just Byr
                        };
                        break;
                    case "Byn":
                        if(TypeA[j] === "Exp"){
                            cashboxA[1] = cashboxA[1] - AmountA[j];
                        }
                        else{
                            cashboxA[1] = cashboxA[1] + AmountA[j];
                        };
                        break;
                    case "Usd":
                       if(TypeA[j] === "Exp"){
                            cashboxA[2] = cashboxA[2] - AmountA[j];
                        }
                        else{
                            cashboxA[2] = cashboxA[2] + AmountA[j];
                        }; 
                }
            }

        }
        return cashboxA;
}

function exchange(nowTimeDay, ratesH, amount, fromCurrency, toCurrency){
    // amount is the volume of the fromCurency
    var fromCurency;
    var toCurrency;
    // nowTimeDay in days from zero point
    //fromCurrency = "Byr", "Byn", "Usd"
    //toCurrency = "Byr", "Byn", "Usd"
    var rate = ratesH.rateInDays[nowTimeDay]; // rate for the nowTimeDay
    var fromByr = 0; var fromByn = 0; var fromUsd = 0; // we sell it to a bank
    var toByr = 0; var toByn = 0; var toUsd = 0; // we buy it from a bank
    var exchangeResultA = []; // object for return the result of exchange operation
    // exchangeResultA[0] = fromByr; exchangeResultA[1] = fromByn; exchangeResultA[2] = fromUsd;
    // exchangeResultA[3] = toByr; exchangeResultA[4] = toByn; exchangeResultA[5] = toUsd;
    if((fromCurrency === "Byr") || (fromCurrency === "Byn")){
        if(fromCurrency === "Byr"){
            fromByr = amount; toUsd = Math.floor(amount/rate);// floor is to safe i fthe result will be 5.000001
        } else{
            fromByn = amount; toUsd = Math.floor(amount/rate);// floor is to safe i fthe result will be 5.000001
        }
    }
    if((toCurrency === "Byr") || (toCurrency === "Byn")){
        if(toCurrency === "Byr"){
            fromUsd = amount; toByr = Math.floor(amount * rate * 100) / 100;// 2 numbers after the point
        } else{
            fromUsd = amount; toByn = Math.floor(amount * rate * 100) / 100;// 2 numbers after the point
        }
    }
    exchangeResultA[0] = fromByr; exchangeResultA[1] = fromByn; exchangeResultA[2] = fromUsd;
    exchangeResultA[3] = toByr; exchangeResultA[4] = toByn; exchangeResultA[5] = toUsd;
    // print("fromByr = " + fromByr);
    // print("fromUsd = "+ fromUsd);
    // print("toByr = "+ toByr); 
    // print("toUsd = " + toUsd);
    // print("nowTimeDay = " + nowTimeDay);
    // print("amount = "+ amount);
    // print("rate = " + rate);
    return exchangeResultA;
}

function makeExchangeTransaction(nowTimeDay, Type, Category, Name, Amount, Currency, Account){
    var exchangeDate = new Date();
    exchangeDate.setTime(nowTimeDay*1000*60*60*24);// Data is in standard format
    var Type = Type;
    var Category = Category; 
    var Name = Name; 
    var Currency = Currency;
    var Account = Account;
    db.transactions.insert({"Date": exchangeDate, "Type": Type, "Category": Category, "Name": Name,
                           "Amount": Amount, "Currency": Currency, "Account": Account, "Wallet_id": WalletsIdH[Account]});
    // print("start insert");
    // print("Date = " + exchangeDate);
    // print("Type = " + Type);
    // print("Category = " + Category);
    // print("Name = " + Name);
    // print("Amount = " + Amount);
    // print("Currency = " + Currency);
    // print("Account = " + Account);
    // print("finish insert");
// we insert document into the collection
}

function ifWeNeedExchange(nowTimeDay, ratesH, Byr, Byn, Usd){
    var exchangeResultA = []; // we store the result of the exchange function
    var weNeedByr;// we need Byr to compensate the -Usd
    var weTakeByr;// we take all money to compensate a part of -Usd
    var weHaveUsd;// we buy this money when we sell "weTakeByr" money
    var weNeedUsd; // we need Usd to compensate the -Byr
    var weTakeUsd; // we take all money to compensate a part of -Byr
    var weHaveByr; // we buy this money when we sell "weTakeUsd" money
    var weNeedByn; 
    var weTakeByn;
    var weHaveByn;
    var rate = ratesH.rateInDays[nowTimeDay]; // rate for the nowTimeDay
    var UsdNoCent; // in case of nowTimeDay < DAY_OF_DENOMINATION Byr > 0 Usd < 0
    var weCanBuyUsd; // in case of nowTimeDay < DAY_OF_DENOMINATION Byr > 0 Usd < 0
    var weCanSellUsd; // in case of nowTimeDay < DAY_OF_DENOMINATION Byr < 0 Usd > 0
    
    
    if(nowTimeDay < DAY_OF_DENOMINATION){
        if((Byr > 0) && (Usd < 0)){
            // print("We exchange Byr ##day is = " + nowTimeDay);
            // print("Byr is = " + Byr);
            UsdNoCent = Math.floor(Usd); // Usd <0 if Usd = -5.60 then UsdNoCent = -6
            // print("UsdNoCent = " + UsdNoCent);
            weNeedByr = -UsdNoCent * rate;
            // print("weNeedByr = " + weNeedByr);
            // money for compensate -Usd
            if(Byr >= weNeedByr){
                // we have enough money for compensate -Usd
                exchangeResultA = exchange(nowTimeDay, ratesH, weNeedByr, "Byr", "Usd");
                // exchangeResultA[0] = fromByr; exchangeResultA[1] = fromByn; exchangeResultA[2] = fromUsd;
                // exchangeResultA[3] = toByr; exchangeResultA[4] = toByn; exchangeResultA[5] = toUsd;
                makeExchangeTransaction(nowTimeDay, "Exp", "Exchange", "ByrUsd", exchangeResultA[0], "Byr", "PurseByr");
                // expense transaction Byr
                makeExchangeTransaction(nowTimeDay, "Inc", "Exchange", "ByrUsd", exchangeResultA[5], "Usd", "SafeUsd");
                // incoming transaction Usd
            }
            
            if(Byr < weNeedByr){
                // we have not enough money, we will sell all Byr
                weCanBuyUsd = Math.floor(Byr / rate); // we can buy this Usd without cents
                // print("weCanBuyUsd = " + weCanBuyUsd);
                weTakeByr = weCanBuyUsd * rate; // we take all Byr money to buy Usd without cents
                // print("weTakeByr = " + weTakeByr);
                // how many Usd we have if we sell all Byr
                exchangeResultA = exchange(nowTimeDay, ratesH, weTakeByr, "Byr", "Usd");
                // print("exchangeResultA[0] = " + exchangeResultA[0]);
                // print("exchangeResultA[5] = " + exchangeResultA[5]);
                // exchangeResultA[0] = fromByr; exchangeResultA[1] = fromByn; exchangeResultA[2] = fromUsd;
                // exchangeResultA[3] = toByr; exchangeResultA[4] = toByn; exchangeResultA[5] = toUsd;
                makeExchangeTransaction(nowTimeDay, "Exp", "Exchange", "ByrUsd", exchangeResultA[0], "Byr", "PurseByr");
                // expense transaction Byr
                makeExchangeTransaction(nowTimeDay, "Inc", "Exchange", "ByrUsd", exchangeResultA[5], "Usd", "SafeUsd");
                // incoming transaction Usd
            }
            
        }

        if ((Byr < 0) && (Usd > 0)){
            // print("We exchange Usd ##day is = " + nowTimeDay);
            // print("Usd is = " + Usd);
            weNeedUsd = -Math.floor(Byr / rate);// we need Usd is rounded for the bigger nearest integer value
            // money for compensate -Byr
            if(Usd >= weNeedUsd){
                // we have enough money for compensate -Byr
                exchangeResultA = exchange(nowTimeDay, ratesH, weNeedUsd, "Usd", "Byr");
                // exchangeResultA[0] = fromByr; exchangeResultA[1] = fromByn; exchangeResultA[2] = fromUsd;
                // exchangeResultA[3] = toByr; exchangeResultA[4] = toByn; exchangeResultA[5] = toUsd;
                makeExchangeTransaction(nowTimeDay, "Exp", "Exchange", "UsdByr", exchangeResultA[2], "Usd", "SafeUsd");
                // expense transaction Usd
                makeExchangeTransaction(nowTimeDay, "Inc", "Exchange", "UsdByr", exchangeResultA[3], "Byr", "PurseByr");
                // incoming transaction Byr
            }

            if(Usd < weNeedUsd){
                // we have not enough money, we will sell all Usd
                weCanSellUsd = Math.floor(Usd); // we can sell Usd without cents
                weTakeUsd = weCanSellUsd; // we take all Usd money without cents
                weHaveByr = weTakeUsd * rate;
                // how many Byr we have if we sell all Usd
                exchangeResultA = exchange(nowTimeDay, ratesH, weTakeUsd, "Usd", "Byr");
                // exchangeResultA[0] = fromByr; exchangeResultA[1] = fromByn; exchangeResultA[2] = fromUsd;
                // exchangeResultA[3] = toByr; exchangeResultA[4] = toByn; exchangeResultA[5] = toUsd;
                makeExchangeTransaction(nowTimeDay, "Exp", "Exchange", "UsdByr", exchangeResultA[2], "Usd", "SafeUsd");
                // expense transaction Usd
                makeExchangeTransaction(nowTimeDay, "Inc", "Exchange", "UsdByr", exchangeResultA[3], "Byr", "PurseByr");
                // incoming transaction Byr
            }
        }
    }
    //// WE NEED TO WRITE THE SAME CODE FOR THE BYN AND USD!!!
    if(nowTimeDay >= DAY_OF_DENOMINATION){
        if((Byn > 0) && (Usd < 0)){
            // print("We exchangr Byn ##day is = " + nowTimeDay);
            // print("Byn is = " + Byn);
            UsdNoCent = Math.floor(Usd); // Usd <0 if Usd = -5.60 then UsdNoCent = -6
            weNeedByn = -UsdNoCent * rate;
            // money for compensate -Usd
            if(Byn >= weNeedByn){
                // we have enough money for compensate -Usd
                exchangeResultA = exchange(nowTimeDay, ratesH, weNeedByn, "Byn", "Usd");
                // exchangeResultA[0] = fromByr; exchangeResultA[1] = fromByn; exchangeResultA[2] = fromUsd;
                // exchangeResultA[3] = toByr; exchangeResultA[4] = toByn; exchangeResultA[5] = toUsd;
                makeExchangeTransaction(nowTimeDay, "Exp", "Exchange", "BynUsd", exchangeResultA[1], "Byn", "PurseByn");
                // expense transaction Byr
                makeExchangeTransaction(nowTimeDay, "Inc", "Exchange", "BynUsd", exchangeResultA[5], "Usd", "SafeUsd");
                // incoming transaction Usd
            }
            
            if(Byn < weNeedByn){
                // we have not enough money, we will sell all Byr
                weCanBuyUsd = Math.floor(Byn / rate); // we can buy this Usd without cents
                weTakeByn = weCanBuyUsd * rate; // we take all Byn money to buy Usd without cents
                // how many Usd we have if we sell all Byr
                exchangeResultA = exchange(nowTimeDay, ratesH, weTakeByn, "Byn", "Usd");
                // exchangeResultA[0] = fromByr; exchangeResultA[1] = fromByn; exchangeResultA[2] = fromUsd;
                // exchangeResultA[3] = toByr; exchangeResultA[4] = toByn; exchangeResultA[5] = toUsd;
                makeExchangeTransaction(nowTimeDay, "Exp", "Exchange", "BynUsd", exchangeResultA[1], "Byn", "PurseByn");
                // expense transaction Byr
                makeExchangeTransaction(nowTimeDay, "Inc", "Exchange", "BynUsd", exchangeResultA[5], "Usd", "SafeUsd");
                // incoming transaction Usd
            }
            
        }

        if ((Byn < 0) && (Usd > 0)){
            // print("We exchange Usd ##day is = " + nowTimeDay);
            // print("Usd is = " + Usd);
            weNeedUsd = -Math.floor(Byn / rate);// we need Usd is rounded for the bigger nearest integer value
            // money for compensate -Byn
            if(Usd >= weNeedUsd){
                // we have enough money for compensate -Byr
                exchangeResultA = exchange(nowTimeDay, ratesH, weNeedUsd, "Usd", "Byn");
                // exchangeResultA[0] = fromByr; exchangeResultA[1] = fromByn; exchangeResultA[2] = fromUsd;
                // exchangeResultA[3] = toByr; exchangeResultA[4] = toByn; exchangeResultA[5] = toUsd;
                makeExchangeTransaction(nowTimeDay, "Exp", "Exchange", "UsdByn", exchangeResultA[2], "Usd", "SafeUsd");
                // expense transaction Usd
                makeExchangeTransaction(nowTimeDay, "Inc", "Exchange", "UsdByn", exchangeResultA[4], "Byn", "PurseByn");
                // incoming transaction Byr
            }

            if(Usd < weNeedUsd){
                // we have not enough money, we will sell all Usd
                weCanSellUsd = Math.floor(Usd); // we can sell Usd without cents
                weTakeUsd = weCanSellUsd; // we take all Usd money without cents
                weHaveByn = weTakeUsd * rate;
                // how many Byr we have if we sell all Usd
                exchangeResultA = exchange(nowTimeDay, ratesH, weTakeUsd, "Usd", "Byn");
                // exchangeResultA[0] = fromByr; exchangeResultA[1] = fromByn; exchangeResultA[2] = fromUsd;
                // exchangeResultA[3] = toByr; exchangeResultA[4] = toByn; exchangeResultA[5] = toUsd;
                makeExchangeTransaction(nowTimeDay, "Exp", "Exchange", "UsdByn", exchangeResultA[2], "Usd", "SafeUsd");
                // expense transaction Usd
                makeExchangeTransaction(nowTimeDay, "Inc", "Exchange", "UsdByn", exchangeResultA[4], "Byn", "PurseByn");
                // incoming transaction Byr
            }
        }
    }

}

function denominationExchange(nowTimeDay, PurseByr, Byr){
    
    // print("##The value of PurseByr ====================" + PurseByr);
    // var toByn = Math.floor(Byr / 10000); // we calculate the incomes, ignore if < 10000.
    // var fromByr = toByn * 10000; // we take an integer fromByr
    var fromPurseByr = PurseByr; // we take all PurseByr 
    var toPurseByn = Math.floor(fromPurseByr / 10000); // the we exchange PurseByr to the PurseByn
    
    makeExchangeTransaction(nowTimeDay, "Exp", "Denomination", "ByrByn", fromPurseByr, "Byr", "PurseByr");

    makeExchangeTransaction(nowTimeDay, "Inc", "Denomination", "ByrByn", toPurseByn, "Byn", "PurseByn");

    var fromCardByr = Byr - PurseByr;
    var toCardByn = Math.floor(fromCardByr / 10000); // we exchange CardByr to the CardByn

    makeExchangeTransaction(nowTimeDay, "Exp", "Denomination", "ByrByn", fromCardByr, "Byr", "CardByr");

    makeExchangeTransaction(nowTimeDay, "Inc", "Denomination", "ByrByn", toCardByn, "Byn", "CardByn");

    
    // makeExchangeTransaction(nowTimeDay, "Exp", "Denomination", "ByrByn", fromByr, "Byr", "PurseByr");
    // expense transaction Byr
    // makeExchangeTransaction(nowTimeDay, "Inc", "Denomination", "ByrByn", toByn, "Byn", "PurseByn");
    // incoming transaction Byn
}

function randomFriendId(){
    var n; // a random number in (1,2,3)
    var friendId;
    n = Math.floor(Math.random()*3+1);
    switch(n){
        case 1:
        friendId = friendsNamesIdH.firstFriend;
        break;

        case 2:
        friendId = friendsNamesIdH.secondFriend;
        break;

        case 3:
        friendId = friendsNamesIdH.thirdFriend;
    }
    return friendId;
}// we return Id of the random chosen friends

function borrow(amount, currency){
    var borrowResultA = []; // we store the result of the borrow function
    borrowResultA[0] = 0; borrowResultA[1] = 0; borrowResultA[2] = 0;
    // 0 - Byr, 1 - Byn, 2 - Usd, 3 - Friend's Id. Let's function borrow choose random friend
    var currency = currency;
    var Byr = 0;
    var Byn = 0;
    var Usd = 0;
    switch(currency){
        case "Byr":
        Byr = 1000000 * (Math.ceil(amount / 1000000));
        // Math.ceil(Byr/1000000) - to round it to a bigger number to borrow it
        //Byr = // counts as 1 000 000, 2 000 000, 3 000 000 etc.
        break;

        case "Byn":
        Byn = 100 * (Math.ceil(amount / 100));
        break;

        case "Usd":
        Usd = 100 * (Math.ceil(amount / 100));
    }
    borrowResultA[0] = Byr; borrowResultA[1] = Byn; borrowResultA[2] = Usd;
    borrowResultA[3] = randomFriendId();
    
    return borrowResultA;
}// returns borrowResultA[0]...borrowResultA[4]

function makeBorrowTransaction(nowTimeDay, Type, Category, Amount, Currency, Account, Friend){
    var borrowDate = new Date();
    borrowDate.setTime(nowTimeDay*1000*60*60*24);// Data is in standard format
    var Type = Type;
    var Category = Category; 
    var Currency = Currency;
    var Account = Account;
    db.transactions.insert({"Date": borrowDate, "Type": Type, "Category": Category, "Amount": Amount,
                            "Currency": Currency, "Account": Account, "Wallet_id": WalletsIdH[Account], "Friend_id": Friend});
}

function ifWeNeedBorrow(nowTimeDay, Byr, Byn, Usd){
    print("Day = "+ nowTimeDay);
    print("Byr = " + Byr);
    print("Byn = " + Byn);
    print("Usd = " + Usd);
    var borrowResultA = []; // we store the result of the borrow function
    if(Byr < 0){
        borrowResultA = borrow(-Byr, "Byr");
        makeBorrowTransaction(nowTimeDay, "Inc", "Borrow", borrowResultA[0], "Byr", "PurseByr", borrowResultA[3]);
    }
    if(Byn < 0){
        borrowResultA = borrow(-Byn, "Byn");
        makeBorrowTransaction(nowTimeDay, "Inc", "Borrow", borrowResultA[1], "Byn", "PurseByn", borrowResultA[3]);
    }
    if(Usd < 0){
        borrowResultA = borrow(-Usd, "Usd");
        makeBorrowTransaction(nowTimeDay, "Inc", "Borrow", borrowResultA[2], "Usd", "SafeUsd", borrowResultA[3]);
    }
}

function runCashFlowPLus(begin, end){// we want to use day from the begining Day 1970
    // setup the WalletsIdH
    findWallet("PurseByr"); findWallet("PurseByn"); findWallet("SafeUsd");
    findWallet("CardByr"); findWallet("CardByn");
    //_id of the wallets are in the WalletsIdH[accountName]
    db.friends.remove({}); // we remove the collection if we in case if it was created before
    writeFriends("firstFriend"); writeFriends("secondFriend"); writeFriends("thirdFriend");
    // we created collection friends
    //ratesH.data is in a string format
    var startDATE = standartDate(begin);
    var startTimeDay = Math.floor(startDATE.getTime()/(1000*60*60*24));
    var finishDATE = standartDate(end);
    var finishTimeDay = Math.floor(finishDATE.getTime()/(1000*60*60*24));
    //startTimeDay = 14610
    //finishTimeDay = 17130
    // number of the days is finishTimeDay-startTimeDay+1 = 2521
    var flowcashboxA = []; // flowcashboxA is the global cashbox, it is the cashflow
    flowcashboxA[0] = 0; flowcashboxA[1] = 0; flowcashboxA[2] = 0; flowcashboxA[3] = 0; flowcashboxA[4] = 0;
    // let cashboxA[0] = Byr, cashboxA[1] = Byn, cashboxA[2] = Usd, cashboxA[3] = PurseByr, cashboxA[4] = CardByr
    var cashboxA = []; // we store the result of calculateCashDelta in it
    var preCashboxA = []; // we previously calculate the cashflow before operating currency exchange
    preCashboxA[0] = 0; preCashboxA[1] = 0; preCashboxA[2] = 0; preCashboxA[3] = 0; preCashboxA[4] = 0;
    var beforeCashboxA = []; // we previously calculate the cashflow before operating Borrow
    beforeCashboxA[0] = 0; beforeCashboxA[1] = 0; beforeCashboxA[2] = 0; beforeCashboxA[3] = 0; beforeCashboxA[4] = 0;
    
    for(var cycleTimeDay = startTimeDay; cycleTimeDay <= finishTimeDay; cycleTimeDay++){
        
        cashboxA = calculateCashDelta(cycleTimeDay);
        // dayCashboxA[0] = Byr; dayCashboxA[1] = Byn; dayCashboxA[2] = Usd; dayCashboxA[3] = PurseByr; dayCashboxA[4] = CardByr;
        print("1-----cashboxA[0] = " + cashboxA[0]);
        print("1-----cashboxA[1] = " + cashboxA[1]);
        print("1-----cashboxA[2] = " + cashboxA[2]);
        for(var i = 0; i < flowcashboxA.length; i++){
            preCashboxA[i] = flowcashboxA[i] + cashboxA[i];
            // we are calculating previously cashflow without exchange
        }
        if(cycleTimeDay === DAY_OF_DENOMINATION){
            // print("==================cycleTimeDay = " + cycleTimeDay);
            // print("=================DAY_OF_DENOMINATION = " + DAY_OF_DENOMINATION);
            // we need to transfer Byr into Byn
            // print("##The value of Byr ===================================" + preCashboxA[0]);
            denominationExchange(cycleTimeDay, preCashboxA[3], preCashboxA[0]);//// denomination/////////////////
            // we generate exchange transactions from Byr to Byn
            // we need only PurseByr and CardByr accounts to make the transfer
        }
        // print("cycleTimeDay ---------------------- " + cycleTimeDay);
        
        ifWeNeedExchange(cycleTimeDay, ratesH, preCashboxA[0], preCashboxA[1], preCashboxA[2]);
        // we generate the exchange transactions if we need it
        cashboxA = calculateCashDelta(cycleTimeDay);
        print("2-----cashboxA[0] = " + cashboxA[0]);
        print("2-----cashboxA[1] = " + cashboxA[1]);
        print("2-----cashboxA[2] = " + cashboxA[2]);
        // cashboxA is an actual balance of the day with exchanges
        for(var k = 0; k < flowcashboxA.length; k++){
            beforeCashboxA[k] = flowcashboxA[k] + cashboxA[k];
            // we are calculating previously cashflow without borrow
        }
        print("##Day = " + cycleTimeDay);
        print("##beforeCashboxA[0] = "+ beforeCashboxA[0]);
        print("##beforeCashboxA[1] = "+ beforeCashboxA[1]);
        print("##beforeCashboxA[2] = "+ beforeCashboxA[2]);
        ifWeNeedBorrow(cycleTimeDay, beforeCashboxA[0], beforeCashboxA[1], beforeCashboxA[2]);
        // we generate borrow transactions if we need it
        cashboxA = calculateCashDelta(cycleTimeDay);
        // cashboxA is an actual balance of the day with borrow
        for(var j = 0; j < flowcashboxA.length; j++){
            flowcashboxA[j] = flowcashboxA[j] + cashboxA[j];
        }
        // flowcashboxA has an actual amount of money on the cycleTimeDay
        
    }
}

runCashFlowPLus(findStartData(ratesH), findFinishData(ratesH)); //start CashFlowPlus