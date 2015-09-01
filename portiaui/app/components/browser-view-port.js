import Ember from 'ember';
import HoverOverlay from './hover-overlay';
import {ANNOTATION_MODE} from '../services/browser-state';


export default Ember.Component.extend({
    browserOverlays: Ember.inject.service(),
    browserState: Ember.inject.service(),
    selectedModels: Ember.inject.service(),
    viewPortSelection: Ember.inject.service(),

    classNames: ['browser-view-port'],
    classNameBindings: ['noneHovered', 'noneSelected'],

    content: null,
    overlayComponentName: 'hover-overlay',

    noneHovered: Ember.computed.none('viewPortSelection.hoveredElement'),
    noneSelected: Ember.computed.none('selectedModels.currentAnnotation'),
    overlays: Ember.computed.readOnly('browserOverlays.overlayComponents'),
    url: Ember.computed.alias('browserState.url'),

    updateContent: Ember.observer('url', function() {
        var url = this.get('url');

        if (!url) {
            this.set('content', '');
            return;
        }

        if (!url.includes('://')) {
            url = `http://${url}`;
        }

        this.set('browserState.loading', true);
        // use cors-anywhere.herokuapp.com to get the url content
        Ember.$.get(`https://cors-anywhere.herokuapp.com/${url}`,
            Ember.run.bind(this, content => {
                var baseUrl = url.match(/^[^\/]+:\/\/[^\/]+/)[0];
                // make urls relative to page url
                content = content.replace(/(href|src)=(["'])\/(?!\/)/gi, `$1=$2${baseUrl}/`);
                if (!content.includes('<base')) {
                    content = content.replace(/<\/head>/i, `<base href="${url}"/></head>`);
                }
                this.set('content', content);
                this.set('browserState.loading', false);
                Ember.run.later(this, () => {
                    this.bindEventHandlers();
                }, 250);
            })
        );
    }),

    init() {
        this._super();
        this.updateContent();
    },

    willInsertElement() {
        this.get('browserState').registerViewPort(this);
    },

    willDestroyElement() {
        this.get('browserState').unRegisterViewPort(this);
    },

    mouseEnter() {
        this.get('browserOverlays').addOverlayComponent(this);
    },

    mouseLeave() {
        this.get('browserOverlays').removeOverlayComponent(this);
    },

    bindEventHandlers() {
        this.unbindEventHandlers();
        const viewPortDocument = Ember.$('iframe').contents();
        viewPortDocument.on('click.portia', () => {
            this.viewPortClick();
            return false;
        });
    },

    unbindEventHandlers() {
        const viewPortDocument = Ember.$('iframe').contents();
        viewPortDocument.off('.portia');
    },

    viewPortClick() {
        if (this.get('browserState.mode') !== ANNOTATION_MODE) {
            return;
        }

        const hoverOverlay = this.get('browserOverlays.elementOverlays')
            .find((elementOverlay) => elementOverlay instanceof HoverOverlay);
        if (hoverOverlay) {
            hoverOverlay.click();
        }
    }
});
