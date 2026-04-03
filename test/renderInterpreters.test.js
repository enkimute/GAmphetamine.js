// Import the module
import GAmphetamine from '../src/GAmphetamine';
import getInterpreters from '../src/renderInterpreters.js';

describe('renderInterpreters', () => { 

    describe('2DPGA points', () => {

        it("translates Euclidean points", ()=>{
            const GA = GAmphetamine("2DPGA");
            const options  = GA.options;
            const Goptions = {};

            const point = GA.bivector(3,2,1);

            const {interpretePGA} = getInterpreters(options);

            const res = interpretePGA([point], options, Goptions);
            expect(res).toEqual([[0.02,3,2,0]]);
        });

        it("translates Ideal points", ()=>{
            const GA = GAmphetamine("2DPGA");
            const options  = GA.options;
            const Goptions = {};

            const point = GA.bivector(3,2,0);

            const {interpretePGA} = getInterpreters(options);

            const res = interpretePGA([point], options, Goptions);
            expect(res).toEqual([[3,2,0]]);
        });

        it("Handles point radius", ()=>{
            const GA = GAmphetamine("2DPGA");
            const options  = GA.options;
            const Goptions = { pointRadius:2 };

            const point = GA.bivector(3,2,1);

            const {interpretePGA} = getInterpreters(options);

            const res = interpretePGA([point], options, Goptions);
            expect(res).toEqual([[0.04,3,2,0]]);
        });

    });

    describe('2DPGA lines', () => {

        it("translates Euclidean lines", ()=>{
            const GA = GAmphetamine("2DPGA");
            const options  = GA.options;
            const Goptions = {};

            const line = GA.vector(1,1,0);

            const {interpretePGA} = getInterpreters(options);

            const res = interpretePGA([line], options, Goptions);
            expect(res).toEqual([[[0,5,-5],[0,-5,5]]]);
        });

        it("translates the Ideal line", ()=>{
            const GA = GAmphetamine("2DPGA");
            const options  = GA.options;
            const Goptions = {};

            const line = GA.vector(0,0,1);

            const {interpretePGA} = getInterpreters(options);

            const res = interpretePGA([line], options, Goptions);
            expect(res).toEqual([[[0,NaN,NaN],[0,NaN,NaN]]]);
        });


    });


});