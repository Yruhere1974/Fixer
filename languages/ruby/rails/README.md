# Rails Standards — Application Architecture

> Deep-dive standard for Ruby on Rails 7 apps/APIs in the Ummard/Simon ecosystem.
> **Mandate:** business logic lives in **Service Objects / POROs**, controllers stay **skinny**, and models stay **thin**.
> A fat controller stuffed with business logic is **not** acceptable — and neither is a fat "god" model with business logic buried in `before_save`/`after_commit` callbacks. Both are rejected: the first is untestable and the second is invisible, order-dependent, and fires on every persistence path.

See [`../README.md`](../README.md) for base Ruby conventions (naming, RuboCop, RSpec, Bundler). This document layers the Rails-specific architecture on top.

## The Non-Negotiable Rules
1. **Controllers are skinny** — they authenticate, permit params, call one collaborator, and render. No business logic, no multi-step orchestration.
2. **Business logic lives in Service Objects / POROs** (`app/services/…`) — never in controllers, never hidden in ActiveRecord callbacks.
3. **Strong parameters, always** — every write path funnels attributes through a private `permit`ted params method. No `params` reaches a model unfiltered.

Everything below follows from these three rules.

## Prescribed Structure
```text
app/
├── controllers/
│   ├── application_controller.rb      # shared auth / error rescues
│   ├── concerns/                      # shared controller behavior (mixins)
│   │   └── authenticable.rb
│   └── api/
│       └── v1/
│           └── orders_controller.rb   # skinny: params in, service call, render
├── models/
│   ├── order.rb                       # associations, validations, SCOPES — no biz logic
│   ├── user.rb
│   └── concerns/                      # shared model behavior (mixins)
│       └── archivable.rb
├── services/                          # business logic — POROs with #call
│   ├── application_service.rb         # base .call convenience wrapper
│   └── orders/
│       ├── create_order.rb            # Orders::CreateOrder.call(...)
│       └── cancel_order.rb
├── forms/                             # Form Objects for multi-model / non-AR input
│   └── registration_form.rb
├── serializers/                       # JSON shaping (API) — keep out of views/models
│   └── order_serializer.rb
├── jobs/                              # ActiveJob — enqueue from services, not models
└── views/                            # presentation ONLY; no queries, no logic
config/
└── routes.rb                          # RESTful resources
spec/
├── requests/                          # controller/endpoint behavior
├── models/                            # validations, scopes, associations
├── services/                          # business logic in isolation
├── factories/                         # FactoryBot
└── rails_helper.rb
Gemfile
.rubocop.yml
.ruby-version
```

## Routing (RESTful)
```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :orders, only: %i[index show create] do
        member { post :cancel }   # custom actions stay rare and RESTful-adjacent
      end
    end
  end
end
```
- Prefer the seven standard REST actions. Reach for member/collection routes sparingly.
- Version API namespaces (`api/v1`) from day one so contracts can evolve.

## The Skinny Controller (delegates to a Service)
```ruby
# app/controllers/api/v1/orders_controller.rb
module Api
  module V1
    class OrdersController < ApplicationController
      def index
        orders = current_user.orders.recent.includes(:line_items)  # scope + eager-load
        render json: orders, each_serializer: OrderSerializer
      end

      def create
        result = Orders::CreateOrder.call(user: current_user, params: order_params)

        if result.success?
          render json: result.order, serializer: OrderSerializer, status: :created
        else
          render json: { errors: result.errors }, status: :unprocessable_entity
        end
      end

      def cancel
        result = Orders::CancelOrder.call(order: current_user.orders.find(params[:id]))

        if result.success?
          head :no_content
        else
          render json: { errors: result.errors }, status: :unprocessable_entity
        end
      end

      private

      # Strong parameters — the ONLY place raw params become model attributes.
      def order_params
        params.require(:order).permit(:sku, :quantity, :note)
      end
    end
  end
end
```
The controller does four things: authorize, permit params, invoke **one** service, translate the result to HTTP. That is the whole job.

## The Service Object (PORO with a `call` interface)
```ruby
# app/services/application_service.rb
class ApplicationService
  # Lets callers write `Orders::CreateOrder.call(...)` instead of `.new(...).call`.
  def self.call(...)
    new(...).call
  end
end
```
```ruby
# app/services/orders/create_order.rb
module Orders
  class CreateOrder < ApplicationService
    # A small immutable result object — callers branch on #success?, never on exceptions.
    Result = Struct.new(:success?, :order, :errors, keyword_init: true)

    def initialize(user:, params:)
      @user = user
      @params = params
    end

    def call
      order = @user.orders.build(@params)
      order.total_cents = price_for(order)   # business rule lives HERE, not in a callback

      if order.save
        ChargeCustomerJob.perform_later(order.id)   # side effects enqueued explicitly
        Result.new(success?: true, order: order, errors: [])
      else
        Result.new(success?: false, order: order, errors: order.errors.full_messages)
      end
    end

    private

    def price_for(order)
      order.quantity * SkuCatalog.unit_price_cents(order.sku)
    end
  end
end
```
- One service = one business action, expressed as a verb (`CreateOrder`, `CancelOrder`, `ReconcileInvoice`).
- Return a **result** (Struct or dedicated object), not a bare boolean or a raised exception, so controllers read linearly.
- Services own orchestration: validation branching, pricing, enqueuing jobs, notifying — all explicit and in one readable place.

## The Thin Model (associations, validations, scopes)
```ruby
# app/models/order.rb
class Order < ApplicationRecord
  include Archivable                    # shared behavior via a concern

  belongs_to :user
  has_many :line_items, dependent: :destroy

  validates :sku, presence: true
  validates :quantity, numericality: { greater_than: 0 }

  # SCOPES over inline queries — composable, reusable, testable.
  scope :recent, -> { order(created_at: :desc) }
  scope :pending, -> { where(status: :pending) }
  scope :for_sku, ->(sku) { where(sku: sku) }
end
```
- Models declare **structure** (associations, validations) and **query vocabulary** (scopes). They do not orchestrate business processes.
- Chain scopes at the call site (`Order.pending.recent`) instead of hand-writing `where(...).order(...)` in controllers or services.

## Callbacks — Used Sparingly
```ruby
# ✅ Acceptable: a callback that only maintains the object's own invariant.
class Order < ApplicationRecord
  before_validation :normalize_sku

  private

  def normalize_sku
    self.sku = sku.to_s.strip.upcase
  end
end
```
```ruby
# ❌ Rejected: business logic + external side effects hidden in a callback.
class Order < ApplicationRecord
  after_create :charge_customer, :send_receipt, :update_inventory   # invisible, fires everywhere
end
```
- Callbacks are for **local data hygiene** (normalization, derived columns), not for orchestration.
- Anything that touches another aggregate, sends mail, charges money, or enqueues a job belongs in a **Service Object**, called explicitly. Callbacks make that logic run on every `save` — including tests, seeds, and imports — with no visible call site.

## Concerns (Shared Behavior)
```ruby
# app/models/concerns/archivable.rb
module Archivable
  extend ActiveSupport::Concern

  included do
    scope :active, -> { where(archived_at: nil) }
  end

  def archive!
    update!(archived_at: Time.current)
  end
end
```
```ruby
# app/controllers/concerns/authenticable.rb
module Authenticable
  extend ActiveSupport::Concern

  included do
    before_action :authenticate!
  end

  private

  def authenticate!
    head :unauthorized unless current_user
  end
end
```
- Concerns extract **shared behavior** across models or controllers — not a dumping ground for one model's bulk.
- If a concern grows business logic, it is a service in disguise; extract it.

## Avoiding N+1 Queries
```ruby
# ❌ N+1: one query per order to load its user.
Order.recent.each { |o| puts o.user.email }

# ✅ Eager-load the association up front.
Order.recent.includes(:user).each { |o| puts o.user.email }
```
- Any time a collection is rendered and each element touches an association, use `includes` (or `preload`/`eager_load`).
- **Bullet** (see Tooling) fails the build on undetected N+1s — treat its warnings as errors.

## Form Objects (Multi-Model Input)
```ruby
# app/forms/registration_form.rb
class RegistrationForm
  include ActiveModel::Model            # gives validations + a form-friendly interface

  attr_accessor :email, :password, :company_name

  validates :email, :company_name, presence: true

  def save
    return false unless valid?

    ActiveRecord::Base.transaction do   # atomic across MULTIPLE models
      company = Company.create!(name: company_name)
      company.users.create!(email: email, password: password)
    end
    true
  rescue ActiveRecord::RecordInvalid
    false
  end
end
```
- When a single form writes across **several models**, don't cram it into one AR model with `accepts_nested_attributes_for` and cross-cutting callbacks. Use a Form Object.
- `ActiveModel::Model` gives the object validations and a `form_for`-compatible interface without a table.
- The controller treats it exactly like a model: `@form = RegistrationForm.new(form_params); render/redirect on @form.save`.

## Testing
```ruby
# spec/factories/orders.rb
FactoryBot.define do
  factory :order do
    association :user
    sku { "WIDGET-1" }
    quantity { 2 }
    status { :pending }
  end
end
```
```ruby
# spec/services/orders/create_order_spec.rb — business logic in ISOLATION
RSpec.describe Orders::CreateOrder do
  let(:user) { create(:user) }

  it "prices the order and persists it" do
    result = described_class.call(user: user, params: { sku: "WIDGET-1", quantity: 2 })

    expect(result).to be_success
    expect(result.order.total_cents).to eq(2 * SkuCatalog.unit_price_cents("WIDGET-1"))
  end

  it "returns errors and does not persist on invalid input" do
    result = described_class.call(user: user, params: { sku: "", quantity: 0 })

    expect(result).not_to be_success
    expect(result.errors).to be_present
  end
end
```
```ruby
# spec/models/order_spec.rb — validations + scopes
RSpec.describe Order, type: :model do
  it { is_expected.to validate_presence_of(:sku) }

  describe ".recent" do
    it "orders newest first" do
      old = create(:order, created_at: 2.days.ago)
      new = create(:order, created_at: 1.hour.ago)
      expect(Order.recent).to eq([new, old])
    end
  end
end
```
```ruby
# spec/requests/api/v1/orders_spec.rb — endpoint behavior end-to-end
RSpec.describe "Api::V1::Orders", type: :request do
  let(:user) { create(:user) }

  it "creates an order" do
    post "/api/v1/orders",
         params: { order: { sku: "WIDGET-1", quantity: 2 } },
         headers: auth_headers(user)

    expect(response).to have_http_status(:created)
    expect(response.parsed_body["sku"]).to eq("WIDGET-1")
  end
end
```
- **Request specs** cover routing + controller + serialization; **model specs** cover validations + scopes; **service specs** cover business logic with zero HTTP.
- Build data with **FactoryBot**, never fixtures-by-hand. Test service objects in isolation — that isolation is the payoff of keeping logic out of controllers and callbacks.

## Tooling
- **Linting/Formatting**: RuboCop (with `rubocop-rails`, `rubocop-rspec`), per base Ruby standard.
- **Testing**: RSpec (`rspec-rails`) with request/model/service specs.
- **Factories**: FactoryBot (`factory_bot_rails`).
- **N+1 detection**: Bullet — enabled in development and test; configure it to raise so N+1s fail specs.
- **Dependencies**: Bundler; commit `Gemfile.lock`. Pin Ruby via `.ruby-version`.

## Anti-Patterns (Rejected by This Standard)
- ❌ **Fat controllers** — business logic, multi-step orchestration, or transactions inside a controller action instead of a Service Object.
- ❌ **God models** — a model accreting business methods, external calls, and process orchestration far beyond its own persistence concern.
- ❌ **Business logic in callbacks** — charging, emailing, enqueuing, or cross-aggregate writes in `after_save`/`after_commit` instead of an explicit service call.
- ❌ **N+1 queries** — iterating a collection and touching associations without `includes`.
- ❌ **Logic in views** — queries, conditionals with business meaning, or calculations in ERB instead of serializers/presenters/helpers.
- ❌ **Skipping strong params** — passing raw `params` (or `params.permit!`) into `create`/`update` instead of an explicit permitted-attributes method.
- ❌ **Inline queries over scopes** — repeating `where(status: :pending).order(created_at: :desc)` across the app instead of named, composable scopes.
