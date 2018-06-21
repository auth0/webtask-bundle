import map from 'lodash/map';

export default (cb) => {
    cb(null, map.toString());
}
