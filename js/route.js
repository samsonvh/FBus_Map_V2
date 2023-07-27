import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js';

const firebaseConfig = {
    // databaseURL: "https://fbus-388009-default-rtdb.asia-southeast1.firebasedatabase.app/"
    databaseURL: 'https://fbus-public-map-default-rtdb.asia-southeast1.firebasedatabase.app/'
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

var routeData = null;
var routeDataChanged = false;

const routeRef = ref(database, 'locations/');
onValue(routeRef, async (snapshot) => {
    var newRouteData = snapshot.val();
    if (routeData == null) {
        routeData = newRouteData;
    } else {
        var oldKeys = Object.keys(routeData);
        var newKeys = Object.keys(newRouteData);
        oldKeys.sort();
        newKeys.sort();
        if (oldKeys.length == newKeys.length) {
            for (var i = 0; i < oldKeys.length; i++) {
                if (oldKeys[i] != newKeys[i]) {
                    routeData = newRouteData;
                    routeDataChanged = true;
                    console.log('change');
                    break;
                }
            }
        } else {
            routeData = newRouteData;
            routeDataChanged = true;
        }
    }
});

export function until(conditionFunction) {
    const poll = resolve => {
        if (conditionFunction()) resolve();
        else setTimeout(_ => poll(resolve), 400);
    }
    return new Promise(poll);
}

export { routeDataChanged }

export async function getRouteData() {
    await until(_ => routeData != null);
    routeDataChanged = false;
    return routeData;
}