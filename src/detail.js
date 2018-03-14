const cytoscape = require('cytoscape');
const dagre = require('cytoscape-dagre');
const Vue = require('vue').default;
const { ipcRenderer } = require('electron');

const vm = new Vue({
    el: '#detail',
    data: {
        deviceInfo: {
            name: null,
            original_name: null,
            tag_name: null,
            breaker_type: null,
            rated_current: null,
            ct_ratio: null,
            position: null
        }
    }
});

cytoscape.use(dagre);

const cy = cytoscape({
    container: document.querySelector('#cy'),
    layout: {
        name: 'dagre'
    },
    style: [
        {
            selector: 'node',
            style: {
                'label': function (ele) {
                    return ele.data('name') + '\n' + ele.data('tag_name') + '\n' + ele.data('position')
                },
                'text-opacity': 0.5,
                'text-valign': 'center',
                'text-halign': 'right',
                'background-color': '#11479e',
                'background-image': './power.png',
                'background-fit': 'cover',
                'background-clip': 'none'
            }
        },

        {
            selector: 'edge',
            style: {
                'curve-style': 'bezier',
                'width': 4,
                'target-arrow-shape': 'triangle',
                'line-color': '#9dbaea',
                'target-arrow-color': '#9dbaea'
            }
        }
    ],

    // elements: {
    //     nodes: [
    //         { data: { id: 'n0' } },
    //         { data: { id: 'n1' } },
    //         { data: { id: 'n2' } },
    //         { data: { id: 'n3' } },
    //         { data: { id: 'n4' } },
    //         { data: { id: 'n5' } },
    //         { data: { id: 'n6' } },
    //         { data: { id: 'n7' } },
    //         { data: { id: 'n8' } },
    //         { data: { id: 'n9' } },
    //         { data: { id: 'n10' } },
    //         { data: { id: 'n11' } },
    //         { data: { id: 'n12' } },
    //         { data: { id: 'n13' } },
    //         { data: { id: 'n14' } },
    //         { data: { id: 'n15' } },
    //         { data: { id: 'n16' } }
    //     ],
    //     edges: [
    //         { data: { source: 'n0', target: 'n1' } },
    //         { data: { source: 'n1', target: 'n2' } },
    //         { data: { source: 'n1', target: 'n3' } },
    //         { data: { source: 'n4', target: 'n5' } },
    //         { data: { source: 'n4', target: 'n6' } },
    //         { data: { source: 'n6', target: 'n7' } },
    //         { data: { source: 'n6', target: 'n8' } },
    //         { data: { source: 'n8', target: 'n9' } },
    //         { data: { source: 'n8', target: 'n10' } },
    //         { data: { source: 'n11', target: 'n12' } },
    //         { data: { source: 'n12', target: 'n13' } },
    //         { data: { source: 'n13', target: 'n14' } },
    //         { data: { source: 'n13', target: 'n15' } },
    //     ]
    // }
})

ipcRenderer.on('itemDetail', (e, { deviceInfo, dagData }) => {
    // console.log(msg);
    // vm.msg = JSON.stringify(msg, null, 4);

    // node data:
    // [id:string,...]
    // edge data:
    // [{id,start,end,is_backup}]

    // console.log(deviceInfo,)
    console.log(deviceInfo);
    vm.deviceInfo = deviceInfo;
    let nodes = dagData.nodes.map(function (x) {
        let tmp = {};
        tmp.data = _.clone(x);
        tmp.group = "nodes";
        tmp.data.id = 'n' + tmp.data.id;
        return tmp;
    });
    let edges = dagData.edges.map(x => {
        let data = _.clone(x);
        data.id = 'e' + data.id;
        data.source = 'n' + data.start;
        data.target = 'n' + data.end;
        return {
            group: "edges",
            data
        }
    });
    console.log(nodes)
    console.log(edges)
    cy.add(nodes)
    cy.add(edges)
    cy.edges().forEach(ele => {
        if (!ele.data('is_backup'))
            ele.style('line-color', 'red');
    });
    cy.layout({ name: "dagre" }).run()
})