/**
 * Created by mdowd on 4/5/15.
 */

function chloroQuantile(data, k, brkOrJenk){
    data = data.sort(function(a,b) {return a-b});
    var quants = [];
    if (brkOrJenk === "jenks"){
        quants = ss.jenks(data, k)
        quants[quants.length-1]+= .00000001;
        return quants
    }

    var p = .99999999/k;

    for (i=1; i<k+1; i++){
        if (i===k){
            quants.push(ss.quantile(data, p*i) +.0000001)
        } else {
            quants.push(ss.quantile(data, p*i))}
    }
    return quants

}